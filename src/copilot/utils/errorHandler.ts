import { logger } from '@/ui/logger';

/**
 * Copilot错误类型枚举
 */
export enum CopilotErrorType {
    /** 网络连接错误 */
    NETWORK = 'NETWORK',
    /** GitHub认证错误 */
    AUTH = 'AUTH',
    /** Copilot未安装或未找到 */
    NOT_FOUND = 'NOT_FOUND',
    /** MCP协议错误 */
    MCP_PROTOCOL = 'MCP_PROTOCOL',
    /** 进程启动失败 */
    PROCESS_START = 'PROCESS_START',
    /** 进程意外退出 */
    PROCESS_EXIT = 'PROCESS_EXIT',
    /** 命令执行超时 */
    TIMEOUT = 'TIMEOUT',
    /** 无效的响应格式 */
    INVALID_RESPONSE = 'INVALID_RESPONSE',
    /** 权限不足 */
    PERMISSION = 'PERMISSION',
    /** 未知错误 */
    UNKNOWN = 'UNKNOWN'
}

/**
 * Copilot错误详情接口
 */
export interface CopilotError {
    /** 错误类型 */
    type: CopilotErrorType;
    /** 错误消息 */
    message: string;
    /** 友好提示 */
    hint?: string;
    /** 原始错误 */
    originalError?: Error;
    /** 是否可恢复 */
    recoverable: boolean;
    /** 建议的恢复动作 */
    recoveryAction?: string;
}

/**
 * Copilot错误处理器
 */
export class CopilotErrorHandler {
    /**
     * 分类并处理错误
     */
    static classify(error: any): CopilotError {
        logger.debug(`[CopilotErrorHandler] Classifying error: ${error?.message || error}`);
        
        // 优先检查更具体的错误类型 (避免被通用检查覆盖)
        
        // 超时错误 (优先检查,避免被ETIMEDOUT code误判为进程退出)
        if (this.isTimeoutError(error)) {
            return {
                type: CopilotErrorType.TIMEOUT,
                message: 'Command execution timeout',
                hint: 'The command took too long to execute. Try increasing the timeout or check network.',
                originalError: error,
                recoverable: true,
                recoveryAction: 'Retry with longer timeout'
            };
        }
        
        // 权限错误 (优先检查,避免被误判)
        if (this.isPermissionError(error)) {
            return {
                type: CopilotErrorType.PERMISSION,
                message: 'Permission denied',
                hint: 'Insufficient permissions to execute the command.',
                originalError: error,
                recoverable: false,
                recoveryAction: 'Check file permissions or run with appropriate access'
            };
        }
        
        // 网络错误
        if (this.isNetworkError(error)) {
            return {
                type: CopilotErrorType.NETWORK,
                message: 'Network connection failed',
                hint: 'Please check your internet connection and try again.',
                originalError: error,
                recoverable: true,
                recoveryAction: 'Retry after checking network connectivity'
            };
        }
        
        // 认证错误
        if (this.isAuthError(error)) {
            return {
                type: CopilotErrorType.AUTH,
                message: 'GitHub authentication failed',
                hint: 'Please run "gh auth login" to authenticate with GitHub.',
                originalError: error,
                recoverable: true,
                recoveryAction: 'Run: gh auth login'
            };
        }
        
        // Copilot未找到
        if (this.isNotFoundError(error)) {
            return {
                type: CopilotErrorType.NOT_FOUND,
                message: 'Copilot CLI not found',
                hint: 'Please install GitHub Copilot CLI:\n  npm install -g @github/copilot',
                originalError: error,
                recoverable: true,
                recoveryAction: 'Install: npm install -g @github/copilot'
            };
        }
        
        // 进程启动失败
        if (this.isProcessStartError(error)) {
            return {
                type: CopilotErrorType.PROCESS_START,
                message: 'Failed to start Copilot process',
                hint: 'The Copilot CLI process could not be started. Check if the executable is valid.',
                originalError: error,
                recoverable: false,
                recoveryAction: 'Reinstall Copilot CLI'
            };
        }
        
        // MCP协议错误
        if (this.isMcpProtocolError(error)) {
            return {
                type: CopilotErrorType.MCP_PROTOCOL,
                message: 'MCP protocol communication error',
                hint: 'Failed to communicate with Copilot via MCP protocol. Check message format.',
                originalError: error,
                recoverable: false,
                recoveryAction: 'Update Copilot CLI to latest version'
            };
        }
        
        // 响应格式错误
        if (this.isInvalidResponseError(error)) {
            return {
                type: CopilotErrorType.INVALID_RESPONSE,
                message: 'Invalid response format from Copilot',
                hint: 'The response from Copilot could not be parsed.',
                originalError: error,
                recoverable: false,
                recoveryAction: 'Update Copilot CLI'
            };
        }
        
        // 进程意外退出 (最后检查,避免误判其他有code的错误)
        if (this.isProcessExitError(error)) {
            const exitCode = error.code || error.exitCode;
            return {
                type: CopilotErrorType.PROCESS_EXIT,
                message: `Copilot process exited unexpectedly (code: ${exitCode})`,
                hint: 'The Copilot process terminated. This might be a bug in Copilot CLI.',
                originalError: error,
                recoverable: true,
                recoveryAction: 'Restart Copilot'
            };
        }
        
        // 响应格式错误
        if (this.isInvalidResponseError(error)) {
            return {
                type: CopilotErrorType.INVALID_RESPONSE,
                message: 'Invalid response format from Copilot',
                hint: 'The response from Copilot could not be parsed.',
                originalError: error,
                recoverable: false,
                recoveryAction: 'Update Copilot CLI'
            };
        }
        
        // 未知错误
        return {
            type: CopilotErrorType.UNKNOWN,
            message: error?.message || 'An unknown error occurred',
            hint: 'An unexpected error occurred. Please check the logs for details.',
            originalError: error,
            recoverable: false,
            recoveryAction: 'Check logs and report issue'
        };
    }
    
    /**
     * 生成友好的错误消息
     */
    static formatError(copilotError: CopilotError): string {
        const lines: string[] = [];
        
        lines.push(`❌ ${copilotError.message}`);
        
        if (copilotError.hint) {
            lines.push(`💡 ${copilotError.hint}`);
        }
        
        if (copilotError.recoveryAction) {
            lines.push(`🔧 ${copilotError.recoveryAction}`);
        }
        
        if (copilotError.originalError && process.env.DEBUG) {
            lines.push(`\n🐛 Debug: ${copilotError.originalError.message}`);
            if (copilotError.originalError.stack) {
                lines.push(copilotError.originalError.stack);
            }
        }
        
        return lines.join('\n');
    }
    
    /**
     * 尝试从错误中恢复
     */
    static async attemptRecovery(copilotError: CopilotError): Promise<boolean> {
        if (!copilotError.recoverable) {
            logger.warn(`[CopilotErrorHandler] Error is not recoverable: ${copilotError.type}`);
            return false;
        }
        
        logger.debug(`[CopilotErrorHandler] Attempting recovery for: ${copilotError.type}`);
        
        switch (copilotError.type) {
            case CopilotErrorType.NETWORK:
                // 网络错误可以重试
                await this.delay(2000); // 等待2秒
                return true;
                
            case CopilotErrorType.TIMEOUT:
                // 超时可以重试
                await this.delay(1000);
                return true;
                
            case CopilotErrorType.PROCESS_EXIT:
                // 进程退出可以重新启动
                return true;
                
            default:
                return false;
        }
    }
    
    // ============ 私有错误判断方法 ============
    
    private static isNetworkError(error: any): boolean {
        const message = error?.message?.toLowerCase() || '';
        return message.includes('network') 
            || message.includes('econnrefused')
            || message.includes('enotfound')
            || message.includes('etimedout')
            || error.code === 'ECONNREFUSED'
            || error.code === 'ENOTFOUND'
            || error.code === 'ETIMEDOUT';
    }
    
    private static isAuthError(error: any): boolean {
        const message = error?.message?.toLowerCase() || '';
        const stderr = error?.stderr?.toLowerCase() || '';
        return message.includes('not logged in')
            || message.includes('authentication failed')
            || message.includes('unauthorized')
            || stderr.includes('not logged in')
            || stderr.includes('token')
            || stderr.includes('gh auth login');
    }
    
    private static isNotFoundError(error: any): boolean {
        return error?.code === 'ENOENT'
            || error?.message?.includes('not found')
            || error?.message?.includes('command not found');
    }
    
    private static isProcessStartError(error: any): boolean {
        return error?.message?.includes('spawn')
            || error?.message?.includes('failed to start');
    }
    
    private static isProcessExitError(error: any): boolean {
        return error?.code !== undefined && error?.code !== 0
            || error?.exitCode !== undefined && error?.exitCode !== 0;
    }
    
    private static isTimeoutError(error: any): boolean {
        const message = error?.message?.toLowerCase() || '';
        // 只有明确包含 "timeout" 字样才算超时错误
        // ETIMEDOUT 更可能是网络错误,不归类为超时
        return message.includes('timeout') && error?.code !== 'ETIMEDOUT';
    }
    
    private static isMcpProtocolError(error: any): boolean {
        const message = error?.message?.toLowerCase() || '';
        return message.includes('mcp')
            || message.includes('protocol')
            || message.includes('invalid message');
    }
    
    private static isPermissionError(error: any): boolean {
        return error?.code === 'EACCES'
            || error?.code === 'EPERM'
            || error?.message?.includes('permission denied');
    }
    
    private static isInvalidResponseError(error: any): boolean {
        const message = error?.message?.toLowerCase() || '';
        return message.includes('json')
            || message.includes('parse')
            || message.includes('invalid response')
            || error instanceof SyntaxError;
    }
    
    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
