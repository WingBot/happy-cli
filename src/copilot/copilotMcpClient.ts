import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { CopilotMessage, CopilotConfig } from './types';
import { logger } from '@/ui/logger';

/**
 * Copilot MCP客户端基础类
 * 管理Copilot CLI进程的启动、通信和关闭
 */
export class CopilotMcpClient extends EventEmitter {
    private process: ChildProcess | null = null;
    private copilotPath: string;
    private config: CopilotConfig;
    private buffer: string = '';
    private isConnected: boolean = false;
    
    constructor(copilotPath: string, config: CopilotConfig = {}) {
        super();
        this.copilotPath = copilotPath;
        this.config = config;
    }
    
    /**
     * 建立与Copilot CLI的连接
     */
    async connect(): Promise<void> {
        logger.debug('[CopilotMcpClient] Starting Copilot process...');
        
        try {
            // 构造启动参数
            const args: string[] = [];
            
            if (this.copilotPath === 'gh copilot') {
                // gh copilot 扩展 (备用方案,功能受限)
                args.push('copilot', 'chat');
            } else {
                // npm @github/copilot (推荐)
                args.push(
                    '--non-interactive',    // 非交互模式
                    '--allow-all-tools'     // 允许所有工具调用
                );
                
                // 如果有工作目录,添加文件访问权限
                if (this.config.workDir) {
                    args.push('--add-dir', this.config.workDir);
                }
            }
            
            const command = this.copilotPath === 'gh copilot' ? 'gh' : this.copilotPath;
                
            this.process = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: this.config.workDir,
                env: {
                    ...process.env,
                    // 确保使用JSON输出格式
                    COPILOT_OUTPUT_FORMAT: 'json'
                }
            });
            
            if (!this.process.stdout || !this.process.stdin || !this.process.stderr) {
                throw new Error('Failed to create stdio streams');
            }
            
            // 处理标准输出（MCP消息）
            this.process.stdout.on('data', (data: Buffer) => {
                this.handleStdout(data);
            });
            
            // 处理标准错误
            this.process.stderr.on('data', (data: Buffer) => {
                logger.debug(`[CopilotMcpClient] stderr: ${data.toString()}`);
            });
            
            // 处理进程退出
            this.process.on('exit', (code) => {
                logger.debug(`[CopilotMcpClient] Process exited with code ${code}`);
                this.isConnected = false;
                this.emit('exit', code);
            });
            
            // 处理错误
            this.process.on('error', (error) => {
                logger.warn(`[CopilotMcpClient] Process error: ${error.message}`);
                this.emit('error', error);
            });
            
            // 等待初始化完成
            await this.waitForReady();
            this.isConnected = true;
            
            logger.debug('[CopilotMcpClient] Connected successfully');
        } catch (error) {
            logger.warn(`[CopilotMcpClient] Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    
    /**
     * 处理标准输出数据
     */
    private handleStdout(data: Buffer): void {
        this.buffer += data.toString();
        
        // 处理换行分隔的JSON消息
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                const message = JSON.parse(line) as CopilotMessage;
                logger.debug(`[CopilotMcpClient] Received message: ${message.type}`);
                this.emit('message', message);
            } catch (error) {
                logger.warn(`[CopilotMcpClient] Failed to parse message: ${line.substring(0, 100)}`);
            }
        }
    }
    
    /**
     * 等待Copilot就绪
     */
    private async waitForReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Copilot initialization timeout (10s)'));
            }, 10000);
            
            const handler = (message: CopilotMessage) => {
                if (message.type === 'ready') {
                    clearTimeout(timeout);
                    this.off('message', handler);
                    resolve();
                }
            };
            
            this.on('message', handler);
            
            // 如果没有ready消息,假设立即就绪(兼容性处理)
            setTimeout(() => {
                clearTimeout(timeout);
                this.off('message', handler);
                logger.debug('[CopilotMcpClient] No ready message received, assuming ready');
                resolve();
            }, 2000);
        });
    }
    
    /**
     * 发送提示词到Copilot
     */
    async sendPrompt(prompt: string): Promise<void> {
        if (!this.process || !this.process.stdin) {
            throw new Error('Copilot process not started');
        }
        
        if (!this.isConnected) {
            throw new Error('Copilot not connected');
        }
        
        const message = {
            type: 'prompt',
            text: prompt,
            timestamp: Date.now()
        };
        
        logger.debug(`[CopilotMcpClient] Sending prompt: ${prompt.substring(0, 50)}...`);
        this.process.stdin.write(JSON.stringify(message) + '\n');
    }
    
    /**
     * 中止当前操作
     */
    async abort(): Promise<void> {
        if (!this.process || !this.process.stdin) {
            return;
        }
        
        const message = {
            type: 'abort',
            timestamp: Date.now()
        };
        
        logger.debug('[CopilotMcpClient] Sending abort signal');
        this.process.stdin.write(JSON.stringify(message) + '\n');
    }
    
    /**
     * 断开连接
     */
    async disconnect(): Promise<void> {
        logger.debug('[CopilotMcpClient] Disconnecting...');
        
        if (this.process) {
            this.process.kill('SIGTERM');
            
            // 等待进程退出
            await new Promise<void>((resolve) => {
                if (!this.process) {
                    resolve();
                    return;
                }
                
                const timeout = setTimeout(() => {
                    if (this.process) {
                        logger.warn('[CopilotMcpClient] Force killing process');
                        this.process.kill('SIGKILL');
                    }
                    resolve();
                }, 3000);
                
                this.process.once('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            
            this.process = null;
        }
        
        this.isConnected = false;
        logger.debug('[CopilotMcpClient] Disconnected');
    }
    
    /**
     * 获取连接状态
     */
    isConnectedStatus(): boolean {
        return this.isConnected;
    }
}
