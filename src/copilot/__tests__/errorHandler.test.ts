import { describe, test, expect } from 'vitest';
import { CopilotErrorHandler, CopilotErrorType, type CopilotError } from '../utils/errorHandler';

describe('CopilotErrorHandler', () => {
    describe('错误分类', () => {
        test('应该识别网络错误', () => {
            const networkErrors = [
                new Error('network connection failed'),
                { code: 'ECONNREFUSED', message: 'Connection refused' },
                { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' },
                { code: 'ETIMEDOUT', message: 'Connection timed out' },
            ];
            
            for (const error of networkErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.NETWORK);
                expect(classified.recoverable).toBe(true);
            }
        });
        
        test('应该识别认证错误', () => {
            const authErrors = [
                { message: 'not logged in to GitHub', stderr: 'Run: gh auth login' },
                new Error('authentication failed'),
                { stderr: 'The token in keyring is invalid' },
                new Error('unauthorized access'),
            ];
            
            for (const error of authErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.AUTH);
                expect(classified.recoverable).toBe(true);
                expect(classified.recoveryAction).toContain('gh auth login');
            }
        });
        
        test('应该识别Copilot未找到错误', () => {
            const notFoundErrors = [
                { code: 'ENOENT', message: 'copilot not found' },
                new Error('command not found: copilot'),
                { message: 'gh copilot is not found' },
            ];
            
            for (const error of notFoundErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.NOT_FOUND);
                expect(classified.hint).toContain('npm install');
            }
        });
        
        test('应该识别进程启动失败', () => {
            const startErrors = [
                new Error('spawn copilot ENOENT'),
                { message: 'failed to start copilot process' },
            ];
            
            for (const error of startErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.PROCESS_START);
                expect(classified.recoverable).toBe(false);
            }
        });
        
        test('应该识别进程意外退出', () => {
            const exitErrors = [
                { code: 1, message: 'Process exited' },
                { exitCode: 137, message: 'Killed' },
            ];
            
            for (const error of exitErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.PROCESS_EXIT);
                expect(classified.message).toContain('exited unexpectedly');
            }
        });
        
        test('应该识别超时错误', () => {
            const timeoutErrors = [
                new Error('execution timeout'),
                { message: 'Command timeout after 5000ms' },
            ];
            
            for (const error of timeoutErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.TIMEOUT);
                expect(classified.recoverable).toBe(true);
            }
        });
        
        test('应该识别MCP协议错误', () => {
            const mcpErrors = [
                new Error('MCP protocol error'),
                { message: 'invalid MCP message format' },
                new Error('protocol version mismatch'),
            ];
            
            for (const error of mcpErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.MCP_PROTOCOL);
            }
        });
        
        test('应该识别权限错误', () => {
            const permissionErrors = [
                { code: 'EACCES', message: 'permission denied' },
                { code: 'EPERM', message: 'operation not permitted' },
            ];
            
            for (const error of permissionErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.PERMISSION);
            }
        });
        
        test('应该识别无效响应错误', () => {
            const responseErrors = [
                new SyntaxError('Unexpected token in JSON'),
                new Error('failed to parse JSON response'),
                { message: 'invalid response format' },
            ];
            
            for (const error of responseErrors) {
                const classified = CopilotErrorHandler.classify(error);
                expect(classified.type).toBe(CopilotErrorType.INVALID_RESPONSE);
            }
        });
        
        test('未知错误应该归类为UNKNOWN', () => {
            const unknownError = new Error('something weird happened');
            const classified = CopilotErrorHandler.classify(unknownError);
            
            expect(classified.type).toBe(CopilotErrorType.UNKNOWN);
            expect(classified.message).toContain('something weird happened');
        });
    });
    
    describe('错误格式化', () => {
        test('应该生成友好的错误消息', () => {
            const copilotError: CopilotError = {
                type: CopilotErrorType.AUTH,
                message: 'GitHub authentication failed',
                hint: 'Please run "gh auth login"',
                recoverable: true,
                recoveryAction: 'Run: gh auth login'
            };
            
            const formatted = CopilotErrorHandler.formatError(copilotError);
            
            expect(formatted).toContain('❌ GitHub authentication failed');
            expect(formatted).toContain('💡 Please run "gh auth login"');
            expect(formatted).toContain('🔧 Run: gh auth login');
        });
        
        test('DEBUG模式应该显示原始错误', () => {
            const originalEnv = process.env.DEBUG;
            process.env.DEBUG = '1';
            
            const copilotError: CopilotError = {
                type: CopilotErrorType.UNKNOWN,
                message: 'Test error',
                originalError: new Error('Original error details'),
                recoverable: false
            };
            
            const formatted = CopilotErrorHandler.formatError(copilotError);
            expect(formatted).toContain('🐛 Debug');
            expect(formatted).toContain('Original error details');
            
            process.env.DEBUG = originalEnv;
        });
    });
    
    describe('错误恢复', () => {
        test('不可恢复错误应该返回false', async () => {
            const copilotError: CopilotError = {
                type: CopilotErrorType.PERMISSION,
                message: 'Permission denied',
                recoverable: false
            };
            
            const recovered = await CopilotErrorHandler.attemptRecovery(copilotError);
            expect(recovered).toBe(false);
        });
        
        test('网络错误应该尝试恢复', async () => {
            const copilotError: CopilotError = {
                type: CopilotErrorType.NETWORK,
                message: 'Network error',
                recoverable: true
            };
            
            const start = Date.now();
            const recovered = await CopilotErrorHandler.attemptRecovery(copilotError);
            const duration = Date.now() - start;
            
            expect(recovered).toBe(true);
            expect(duration).toBeGreaterThanOrEqual(2000); // 等待2秒
        }, 5000);
        
        test('超时错误应该尝试恢复', async () => {
            const copilotError: CopilotError = {
                type: CopilotErrorType.TIMEOUT,
                message: 'Timeout',
                recoverable: true
            };
            
            const start = Date.now();
            const recovered = await CopilotErrorHandler.attemptRecovery(copilotError);
            const duration = Date.now() - start;
            
            expect(recovered).toBe(true);
            expect(duration).toBeGreaterThanOrEqual(1000); // 等待1秒
        }, 3000);
        
        test('进程退出错误应该允许重启', async () => {
            const copilotError: CopilotError = {
                type: CopilotErrorType.PROCESS_EXIT,
                message: 'Process exited',
                recoverable: true
            };
            
            const recovered = await CopilotErrorHandler.attemptRecovery(copilotError);
            expect(recovered).toBe(true);
        });
    });
    
    describe('集成测试', () => {
        test('完整的错误处理流程', async () => {
            // 1. 模拟一个网络错误
            const originalError = { code: 'ECONNREFUSED', message: 'Connection refused' };
            
            // 2. 分类错误
            const classified = CopilotErrorHandler.classify(originalError);
            expect(classified.type).toBe(CopilotErrorType.NETWORK);
            expect(classified.recoverable).toBe(true);
            
            // 3. 格式化错误消息
            const formatted = CopilotErrorHandler.formatError(classified);
            expect(formatted).toContain('❌');
            expect(formatted).toContain('💡');
            
            // 4. 尝试恢复
            const recovered = await CopilotErrorHandler.attemptRecovery(classified);
            expect(recovered).toBe(true);
        }, 5000);
    });
});
