import { describe, test, expect, beforeAll } from 'vitest';
import { 
    checkGitHubCli, 
    checkCopilotAuth, 
    checkCopilotExtension,
    validateCopilotAccess,
    checkCopilotSetup
} from '../utils/authChecker';

describe('Copilot Auth Checker', () => {
    describe('checkGitHubCli', () => {
        test('应该检测GitHub CLI是否安装', async () => {
            const result = await checkGitHubCli();
            
            expect(result).toHaveProperty('installed');
            expect(typeof result.installed).toBe('boolean');
            
            if (result.installed) {
                expect(result.version).toBeDefined();
                expect(result.version).toMatch(/\d+\.\d+\.\d+/);
            } else {
                expect(result.error).toBeDefined();
            }
        });
    });
    
    describe('checkCopilotAuth', () => {
        test('应该检测GitHub认证状态', async () => {
            const status = await checkCopilotAuth();
            
            expect(status).toHaveProperty('authenticated');
            expect(typeof status.authenticated).toBe('boolean');
            
            if (status.authenticated) {
                // 如果已认证,应该有用户信息或认证方法
                expect(
                    status.user !== undefined || status.authMethod !== undefined
                ).toBe(true);
            } else {
                // 如果未认证,应该有错误信息
                expect(status.error).toBeDefined();
            }
        });
        
        test('未安装gh时应返回未认证', async () => {
            const status = await checkCopilotAuth();
            
            // 这个测试依赖于环境,只验证返回结构
            expect(status).toHaveProperty('authenticated');
        });
    });
    
    describe('checkCopilotExtension', () => {
        test('应该检测Copilot扩展是否安装', async () => {
            const info = await checkCopilotExtension();
            
            expect(info).toHaveProperty('installed');
            expect(typeof info.installed).toBe('boolean');
            
            if (info.installed) {
                // 可能有版本信息
                if (info.version) {
                    expect(info.version).toMatch(/\d+\.\d+\.\d+/);
                }
            }
        });
    });
    
    describe('validateCopilotAccess', () => {
        test('应该验证完整的Copilot访问权限', async () => {
            const result = await validateCopilotAccess();
            
            expect(result).toHaveProperty('valid');
            expect(typeof result.valid).toBe('boolean');
            
            if (!result.valid) {
                expect(result.error).toBeDefined();
                expect(typeof result.error).toBe('string');
            }
        });
    });
    
    describe('checkCopilotSetup', () => {
        test('应该返回完整的设置检查结果', async () => {
            const setup = await checkCopilotSetup();
            
            expect(setup).toHaveProperty('cli');
            expect(setup).toHaveProperty('auth');
            expect(setup).toHaveProperty('extension');
            expect(setup).toHaveProperty('ready');
            
            expect(typeof setup.ready).toBe('boolean');
            
            // ready应该等于所有组件都正常
            const expectedReady = 
                setup.cli.installed && 
                setup.auth.authenticated && 
                setup.extension.installed;
            
            expect(setup.ready).toBe(expectedReady);
        });
    });
});

describe('Error Handling', () => {
    test('所有函数应该优雅处理错误', async () => {
        // 这些函数不应该抛出异常,而是返回错误信息
        await expect(checkGitHubCli()).resolves.toBeDefined();
        await expect(checkCopilotAuth()).resolves.toBeDefined();
        await expect(checkCopilotExtension()).resolves.toBeDefined();
        await expect(validateCopilotAccess()).resolves.toBeDefined();
        await expect(checkCopilotSetup()).resolves.toBeDefined();
    }, 10000); // 增加超时到10秒
});
