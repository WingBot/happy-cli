import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import type { DetectionResult } from '../types';
import { logger } from '@/ui/logger';

const execFileAsync = promisify(execFile);

/**
 * 检测Copilot CLI可执行文件路径
 * 使用多策略检测,优先检测功能完整的 npm copilot
 */
export async function detectCopilotPath(): Promise<string | null> {
    logger.debug('[copilotDetector] Starting Copilot CLI detection...');
    
    // 策略1: 检查 npm copilot 命令 (推荐,功能最完整)
    const npmCopilotCheck = await checkNpmCopilotCommand();
    if (npmCopilotCheck) {
        logger.debug('[copilotDetector] Found npm @github/copilot (recommended)');
        return 'copilot';
    }
    
    // 策略2: 检查 gh copilot 命令 (备用,功能有限)
    const ghCopilotCheck = await checkGhCopilotCommand();
    if (ghCopilotCheck) {
        logger.debug('[copilotDetector] Found gh copilot extension (limited features)');
        return 'gh';
    }
    
    // 策略3: 检查常见安装路径
    const commonPath = await checkCommonPaths();
    if (commonPath) {
        logger.debug(`[copilotDetector] Found at common path: ${commonPath}`);
        return commonPath;
    }
    
    // 策略4: 使用 which/where 查找
    const whichPath = await findInPath();
    if (whichPath) {
        logger.debug(`[copilotDetector] Found in PATH: ${whichPath}`);
        return whichPath;
    }
    
    logger.debug('[copilotDetector] Copilot CLI not found');
    return null;
}

/**
 * 策略1: 检查 npm copilot 命令是否可用 (推荐)
 */
async function checkNpmCopilotCommand(): Promise<boolean> {
    try {
        await execFileAsync('copilot', ['--version'], { 
            timeout: 3000 
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * 策略2: 检查 gh copilot 命令是否可用 (备用)
 */
async function checkGhCopilotCommand(): Promise<boolean> {
    try {
        await execFileAsync('gh', ['copilot', '--version'], { 
            timeout: 3000 
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * 策略3: 检查常见安装路径
 */
async function checkCommonPaths(): Promise<string | null> {
    const homeDir = os.homedir();
    const platform = os.platform();
    
    const possiblePaths: string[] = [];
    
    if (platform === 'darwin' || platform === 'linux') {
        // macOS 和 Linux
        // npm 全局安装路径
        possiblePaths.push(
            join(homeDir, '.nvm/versions/node/*/bin/copilot'), // nvm
            '/usr/local/bin/copilot',
            '/usr/bin/copilot',
            join(homeDir, '.local/bin/copilot'),
            '/opt/homebrew/bin/copilot', // Apple Silicon Homebrew
            // gh copilot 扩展路径 (备用)
            join(homeDir, '.local/bin/gh-copilot'),
            join(homeDir, '.local/share/gh/extensions/gh-copilot/gh-copilot'),
            '/opt/homebrew/bin/gh-copilot'
        );
    } else if (platform === 'win32') {
        // Windows
        possiblePaths.push(
            // npm 全局安装路径
            join(homeDir, 'AppData/Roaming/npm/copilot.cmd'),
            join(homeDir, 'AppData/Roaming/npm/copilot.exe'),
            // gh copilot 扩展路径 (备用)
            join(homeDir, 'AppData/Local/GitHub CLI/extensions/gh-copilot/gh-copilot.exe'),
            join(homeDir, 'AppData/Local/Programs/GitHub CLI/extensions/gh-copilot/gh-copilot.exe')
        );
    }
    
    for (const path of possiblePaths) {
        // 处理通配符路径 (如 nvm)
        if (path.includes('*')) {
            // 简化处理,跳过通配符
            continue;
        }
        if (existsSync(path)) {
            return path;
        }
    }
    
    return null;
}

/**
 * 策略4: 使用 which/where 命令在 PATH 中查找
 */
async function findInPath(): Promise<string | null> {
    const command = os.platform() === 'win32' ? 'where' : 'which';
    // 优先查找 npm copilot,其次 gh copilot
    const candidates = ['copilot', 'gh-copilot', 'gh'];
    
    for (const cmd of candidates) {
        try {
            const { stdout } = await execFileAsync(command, [cmd], {
                timeout: 3000
            });
            
            const path = stdout.trim().split('\n')[0];
            if (path && existsSync(path)) {
                // 如果是 'gh',返回 'gh copilot'
                if (cmd === 'gh') {
                    return 'gh copilot';
                }
                return path;
            }
        } catch {
            // 继续尝试下一个候选
        }
    }
    
    return null;
}

/**
 * 验证Copilot二进制文件是否有效
 */
export async function validateCopilotBinary(path: string | null): Promise<boolean> {
    if (!path) {
        return false;
    }
    
    try {
        logger.debug(`[copilotDetector] Validating binary: ${path}`);
        
        // 特殊处理 'gh copilot' 命令
        if (path === 'gh copilot') {
            const { stdout } = await execFileAsync('gh', ['copilot', '--version'], {
                timeout: 3000
            });
            logger.debug(`[copilotDetector] gh copilot version: ${stdout.trim()}`);
            return true;
        }
        
        // 特殊处理 'copilot' 命令 (npm @github/copilot)
        if (path === 'copilot') {
            const { stdout } = await execFileAsync('copilot', ['--version'], {
                timeout: 3000
            });
            logger.debug(`[copilotDetector] npm copilot version: ${stdout.trim()}`);
            return true;
        }
        
        // 检查文件存在
        if (!existsSync(path)) {
            logger.debug(`[copilotDetector] Binary not found at: ${path}`);
            return false;
        }
        
        // 尝试执行 --version
        const { stdout } = await execFileAsync(path, ['--version'], {
            timeout: 3000
        });
        logger.debug(`[copilotDetector] Version output: ${stdout.trim()}`);
        return true;
    } catch (error: any) {
        logger.warn(`[copilotDetector] Validation failed: ${error.message}`);
        return false;
    }
}

/**
 * 获取Copilot CLI版本信息
 */
export async function getCopilotVersion(path: string): Promise<string | null> {
    try {
        logger.debug(`[copilotDetector] Getting version for: ${path}`);
        
        let stdout: string;
        
        if (path === 'gh copilot') {
            const result = await execFileAsync('gh', ['copilot', '--version'], {
                timeout: 3000
            });
            stdout = result.stdout;
        } else if (path === 'copilot') {
            const result = await execFileAsync('copilot', ['--version'], {
                timeout: 3000
            });
            stdout = result.stdout;
        } else {
            const result = await execFileAsync(path, ['--version'], {
                timeout: 3000
            });
            stdout = result.stdout;
        }
        
        // 尝试解析版本号
        // 可能的格式: "gh-copilot version 1.0.0" 或 "1.0.0" 或 "v1.0.0"
        const versionMatch = stdout.match(/v?([0-9]+\.[0-9]+\.[0-9]+)/);
        const version = versionMatch ? versionMatch[1] : null;
        
        logger.debug(`[copilotDetector] Detected version: ${version || 'unknown'}`);
        return version;
    } catch (error: any) {
        logger.warn(`[copilotDetector] Failed to get version: ${error.message}`);
        return null;
    }
}

/**
 * 执行完整的Copilot检测
 */
export async function detectCopilot(): Promise<DetectionResult> {
    const path = await detectCopilotPath();
    
    if (!path) {
        return {
            success: false,
            error: 'Copilot CLI not found. Please install it with: gh extension install github/gh-copilot'
        };
    }
    
    const isValid = await validateCopilotBinary(path);
    if (!isValid) {
        return {
            success: false,
            path,
            error: 'Copilot CLI found but validation failed'
        };
    }
    
    const version = await getCopilotVersion(path);
    
    return {
        success: true,
        path,
        details: {
            version,
            command: path === 'gh' ? 'gh copilot' : path
        }
    };
}
