import { execFile } from 'child_process';
import { promisify } from 'util';
import type { CopilotAuthStatus, CopilotExtensionInfo } from '../types';
import { logger } from '@/ui/logger';

const execFileAsync = promisify(execFile);

/**
 * 检查GitHub CLI是否安装
 */
export async function checkGitHubCli(): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
        const { stdout } = await execFileAsync('gh', ['--version'], {
            timeout: 5000
        });
        
        // 解析版本号 "gh version 2.40.0 (2023-12-01)"
        const versionMatch = stdout.match(/gh version ([0-9.]+)/);
        const version = versionMatch ? versionMatch[1] : undefined;
        
        logger.debug(`[authChecker] GitHub CLI found: ${version}`);
        return {
            installed: true,
            version
        };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return {
                installed: false,
                error: 'GitHub CLI (gh) not found in PATH'
            };
        }
        
        return {
            installed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * 检查GitHub Copilot是否已认证
 */
export async function checkCopilotAuth(): Promise<CopilotAuthStatus> {
    try {
        logger.debug('[authChecker] Checking GitHub authentication...');
        
        // 首先检查gh是否安装
        const cliCheck = await checkGitHubCli();
        if (!cliCheck.installed) {
            return {
                authenticated: false,
                error: cliCheck.error || 'GitHub CLI not installed'
            };
        }
        
        // 检查认证状态
        const { stdout, stderr } = await execFileAsync('gh', ['auth', 'status'], {
            timeout: 5000
        });
        
        const output = stdout + stderr;
        logger.debug(`[authChecker] Auth status output: ${output.substring(0, 200)}`);
        
        // 检查是否包含已登录标识
        if (output.includes('Logged in to github.com')) {
            // 尝试提取用户名
            const userMatch = output.match(/Logged in to github\.com (?:account|as) ([^\s(]+)/);
            const user = userMatch ? userMatch[1] : undefined;
            
            logger.debug(`[authChecker] Authenticated as: ${user || 'unknown'}`);
            return {
                authenticated: true,
                user,
                authMethod: 'oauth'
            };
        }
        
        return {
            authenticated: false,
            error: 'Not logged in to GitHub'
        };
    } catch (error: any) {
        logger.warn(`[authChecker] Error checking auth: ${error.message}`);
        
        if (error.code === 'ENOENT') {
            return {
                authenticated: false,
                error: 'GitHub CLI (gh) not found'
            };
        }
        
        // gh auth status 在未认证时会返回非0退出码
        if (error.stderr) {
            const stderr = error.stderr.toString();
            if (stderr.includes('not logged into')) {
                return {
                    authenticated: false,
                    error: 'Not logged in to GitHub'
                };
            }
        }
        
        return {
            authenticated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * 检查Copilot是否已安装 (优先npm @github/copilot,其次gh copilot扩展)
 */
export async function checkCopilotExtension(): Promise<CopilotExtensionInfo> {
    // 策略1: 检查 npm 全局安装的 @github/copilot
    try {
        logger.debug('[authChecker] Checking npm @github/copilot...');
        
        const { stdout } = await execFileAsync('npm', ['list', '-g', '@github/copilot', '--depth=0'], {
            timeout: 5000
        });
        
        // 检查是否包含 @github/copilot
        if (stdout.includes('@github/copilot@')) {
            const versionMatch = stdout.match(/@github\/copilot@([0-9]+\.[0-9]+\.[0-9]+)/);
            const version = versionMatch ? versionMatch[1] : undefined;
            
            logger.debug(`[authChecker] npm copilot found: ${version || 'unknown version'}`);
            return {
                installed: true,
                version,
                installMethod: 'npm'
            };
        }
    } catch (error: any) {
        logger.debug(`[authChecker] npm check failed: ${error.message}`);
    }
    
    // 策略2: 检查 gh copilot 扩展 (备用)
    try {
        logger.debug('[authChecker] Checking gh copilot extension...');
        
        const { stdout } = await execFileAsync('gh', ['extension', 'list'], {
            timeout: 5000
        });
        
        logger.debug(`[authChecker] Extension list: ${stdout.substring(0, 200)}`);
        
        // 查找 github/gh-copilot 行
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (line.includes('github/gh-copilot') || line.includes('gh-copilot')) {
                // 尝试提取版本号 "gh-copilot  github/gh-copilot  v1.0.0"
                const versionMatch = line.match(/v?([0-9]+\.[0-9]+\.[0-9]+)/);
                const version = versionMatch ? versionMatch[1] : undefined;
                
                logger.debug(`[authChecker] gh copilot extension found: ${version || 'unknown version'}`);
                return {
                    installed: true,
                    version,
                    installMethod: 'gh-extension'
                };
            }
        }
        
        logger.debug('[authChecker] Copilot not found in gh extensions');
    } catch (error: any) {
        logger.warn(`[authChecker] Error checking gh extension: ${error.message}`);
    }
    
    return {
        installed: false
    };
}

/**
 * 验证Copilot访问权限
 */
export async function validateCopilotAccess(): Promise<{ valid: boolean; error?: string }> {
    try {
        logger.debug('[authChecker] Validating Copilot access...');
        
        // 检查认证
        const authStatus = await checkCopilotAuth();
        if (!authStatus.authenticated) {
            return {
                valid: false,
                error: authStatus.error || 'Not authenticated'
            };
        }
        
        // 检查扩展
        const extensionInfo = await checkCopilotExtension();
        if (!extensionInfo.installed) {
            return {
                valid: false,
                error: 'Copilot extension not installed'
            };
        }
        
        logger.debug('[authChecker] Copilot access validated');
        return {
            valid: true
        };
    } catch (error: any) {
        logger.warn(`[authChecker] Error validating access: ${error.message}`);
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * 获取完整的Copilot设置检查结果
 */
export async function checkCopilotSetup() {
    const cliCheck = await checkGitHubCli();
    const authStatus = await checkCopilotAuth();
    const extensionInfo = await checkCopilotExtension();
    
    return {
        cli: cliCheck,
        auth: authStatus,
        extension: extensionInfo,
        ready: cliCheck.installed && authStatus.authenticated && extensionInfo.installed
    };
}
