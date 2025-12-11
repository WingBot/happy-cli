/**
 * Copilot CLI command handler
 * Integrates GitHub Copilot CLI with Happy
 */

import chalk from 'chalk';
import { CopilotMcpClient } from '@/copilot/copilotMcpClient';
import { detectCopilot } from '@/copilot/utils/copilotDetector';
import { checkCopilotSetup } from '@/copilot/utils/authChecker';
import { CopilotErrorHandler } from '@/copilot/utils/errorHandler';
import { logger } from '@/ui/logger';
import type { CopilotConfig } from '@/copilot/types';

/**
 * 处理 copilot 命令
 */
export async function handleCopilotCommand(args: string[]): Promise<void> {
    try {
        // 解析命令行参数
        const config = parseArguments(args);
        
        // 显示帮助信息
        if (config.help) {
            showHelp();
            return;
        }
        
        // 显示版本信息
        if (config.version) {
            await showVersion();
            return;
        }
        
        // 1. 检查 Copilot 设置
        console.log(chalk.blue('🔍 Checking Copilot setup...'));
        const setupStatus = await checkCopilotSetup();
        
        if (!setupStatus.ready) {
            console.error(chalk.red('✗ Copilot setup incomplete:'));
            
            if (!setupStatus.cli.installed) {
                console.error(chalk.yellow('  • GitHub CLI not installed'));
                console.error(chalk.gray('    Install: https://cli.github.com/'));
            }
            
            if (!setupStatus.auth.authenticated) {
                console.error(chalk.yellow('  • Not authenticated with GitHub'));
                console.error(chalk.gray('    Run: gh auth login'));
            }
            
            if (!setupStatus.extension.installed) {
                console.error(chalk.yellow('  • Copilot CLI not installed'));
                console.error(chalk.gray('    Install: npm install -g @github/copilot'));
            }
            
            process.exit(1);
        }
        
        console.log(chalk.green('✓ Copilot setup verified'));
        if (setupStatus.extension.installMethod) {
            console.log(chalk.gray(`  Install method: ${setupStatus.extension.installMethod}`));
        }
        if (setupStatus.extension.version) {
            console.log(chalk.gray(`  Version: ${setupStatus.extension.version}`));
        }
        
        // 2. 检测 Copilot CLI 路径
        console.log(chalk.blue('\n🔍 Detecting Copilot CLI...'));
        const detection = await detectCopilot();
        
        if (!detection.success) {
            console.error(chalk.red('✗ Failed to detect Copilot CLI'));
            if (detection.error) {
                console.error(chalk.gray(`  Error: ${detection.error}`));
            }
            process.exit(1);
        }
        
        console.log(chalk.green('✓ Copilot CLI detected'));
        console.log(chalk.gray(`  Path: ${detection.path}`));
        if (detection.details?.command) {
            console.log(chalk.gray(`  Command: ${detection.details.command}`));
        }
        
        // 3. 创建并连接 MCP 客户端
        console.log(chalk.blue('\n🚀 Starting Copilot MCP client...'));
        
        const clientConfig: CopilotConfig = {
            workDir: config.workDir,
            timeout: config.timeout,
            debug: config.debug
        };
        
        const copilotCommand = detection.details?.command || detection.path!;
        const client = new CopilotMcpClient(copilotCommand, clientConfig);
        
        // 监听消息
        client.on('message', (message) => {
            logger.info('Copilot message:', message);
            console.log(chalk.cyan('\n📨 Copilot:'), JSON.stringify(message, null, 2));
        });
        
        // 监听错误
        client.on('error', (error) => {
            const copilotError = CopilotErrorHandler.classify(error);
            console.error(chalk.red('\n❌ Error:'));
            console.error(CopilotErrorHandler.formatError(copilotError));
        });
        
        // 监听退出
        client.on('exit', (code) => {
            console.log(chalk.yellow(`\n👋 Copilot process exited with code ${code}`));
        });
        
        // 连接
        await client.connect();
        console.log(chalk.green('✓ Connected to Copilot'));
        
        // 如果有 prompt,发送它
        if (config.prompt) {
            console.log(chalk.blue('\n💬 Sending prompt...'));
            await client.sendPrompt(config.prompt);
        } else {
            console.log(chalk.gray('\n💡 Copilot is ready. Connection test successful.'));
            console.log(chalk.gray('   Use -p "your prompt" to send a message.'));
        }
        
        // 等待一段时间让响应返回
        await new Promise(resolve => setTimeout(resolve, config.waitTime || 5000));
        
        // 断开连接
        console.log(chalk.blue('\n👋 Disconnecting...'));
        await client.disconnect();
        console.log(chalk.green('✓ Disconnected successfully'));
        
    } catch (error: any) {
        const copilotError = CopilotErrorHandler.classify(error);
        console.error(chalk.red('\n❌ Command failed:'));
        console.error(CopilotErrorHandler.formatError(copilotError));
        
        if (copilotError.recoverable) {
            console.log(chalk.yellow('\n🔄 This error might be recoverable.'));
            console.log(chalk.gray(`   ${copilotError.recoveryAction}`));
        }
        
        process.exit(1);
    }
}

/**
 * 解析命令行参数
 */
function parseArguments(args: string[]): {
    help: boolean;
    version: boolean;
    prompt?: string;
    model?: string;
    workDir?: string;
    timeout?: number;
    waitTime?: number;
    debug: boolean;
} {
    const config: any = {
        help: false,
        version: false,
        debug: process.env.DEBUG === '1'
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--help':
            case '-h':
                config.help = true;
                break;
                
            case '--version':
            case '-v':
                config.version = true;
                break;
                
            case '--prompt':
            case '-p':
                config.prompt = args[++i];
                break;
                
            case '--model':
            case '-m':
                config.model = args[++i];
                break;
                
            case '--work-dir':
            case '-w':
                config.workDir = args[++i];
                break;
                
            case '--timeout':
            case '-t':
                config.timeout = parseInt(args[++i], 10);
                break;
                
            case '--wait':
                config.waitTime = parseInt(args[++i], 10);
                break;
                
            case '--debug':
            case '-d':
                config.debug = true;
                break;
                
            default:
                if (arg.startsWith('-')) {
                    console.warn(chalk.yellow(`Warning: Unknown option: ${arg}`));
                }
        }
    }
    
    return config;
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
    console.log(`
${chalk.bold('happy copilot')} - GitHub Copilot CLI Integration

${chalk.bold('USAGE:')}
  happy copilot [OPTIONS]

${chalk.bold('OPTIONS:')}
  -h, --help              Show this help message
  -v, --version           Show Copilot CLI version
  -p, --prompt <text>     Send a prompt to Copilot
  -m, --model <model>     Specify AI model (e.g., claude-sonnet-4.5, gpt-5)
  -w, --work-dir <path>   Set working directory for file access
  -t, --timeout <ms>      Set command timeout in milliseconds
  --wait <ms>             Wait time for response (default: 5000ms)
  -d, --debug             Enable debug mode

${chalk.bold('EXAMPLES:')}
  ${chalk.gray('# Check Copilot setup')}
  happy copilot

  ${chalk.gray('# Send a prompt')}
  happy copilot -p "Explain how async/await works in JavaScript"

  ${chalk.gray('# Use specific model')}
  happy copilot -m claude-sonnet-4.5 -p "Write a React component"

  ${chalk.gray('# With working directory for file access')}
  happy copilot -w /path/to/project -p "Analyze the code structure"

${chalk.bold('NOTES:')}
  • Requires GitHub Copilot CLI installed (npm install -g @github/copilot)
  • Requires GitHub authentication (gh auth login)
  • Uses MCP protocol for communication
`);
}

/**
 * 显示版本信息
 */
async function showVersion(): Promise<void> {
    try {
        const detection = await detectCopilot();
        
        if (detection.success) {
            const version = detection.details?.version || 'unknown';
            console.log(`Copilot CLI version: ${version}`);
            console.log(`Path: ${detection.path}`);
        } else {
            console.log('Copilot CLI not detected');
            if (detection.error) {
                console.log(`Error: ${detection.error}`);
            }
        }
    } catch (error) {
        console.error('Failed to get version:', error);
        process.exit(1);
    }
}
