import { describe, test, expect } from 'vitest';
import {
    detectCopilotPath,
    validateCopilotBinary,
    getCopilotVersion,
    detectCopilot
} from '../utils/copilotDetector';

describe('Copilot Detector', () => {
    describe('detectCopilotPath', () => {
        test('应该尝试检测Copilot CLI路径', async () => {
            const path = await detectCopilotPath();
            
            // 路径可能是null(未安装)或字符串
            expect(path === null || typeof path === 'string').toBe(true);
            
            if (path) {
                console.log(`✓ Copilot found at: ${path}`);
            } else {
                console.log('ℹ Copilot not found (this is OK for test)');
            }
        });
        
        test('找到的路径应该是gh或有效路径', async () => {
            const path = await detectCopilotPath();
            
            if (path) {
                expect(
                    path === 'gh' || 
                    path.includes('copilot') ||
                    path.includes('gh')
                ).toBe(true);
            }
        });
    });
    
    describe('validateCopilotBinary', () => {
        test('null路径应该返回false', async () => {
            const result = await validateCopilotBinary(null);
            expect(result).toBe(false);
        });
        
        test('无效路径应该返回false', async () => {
            const result = await validateCopilotBinary('/非/存在/的/路径');
            expect(result).toBe(false);
        });
        
        test('如果检测到有效路径,应该能验证', async () => {
            const path = await detectCopilotPath();
            
            if (path) {
                const isValid = await validateCopilotBinary(path);
                // 如果找到了路径,它应该是有效的
                expect(isValid).toBe(true);
            }
        }, 10000); // 增加超时时间
    });
    
    describe('getCopilotVersion', () => {
        test('应该能获取gh的版本', async () => {
            const path = await detectCopilotPath();
            
            if (path) {
                const version = await getCopilotVersion(path);
                
                if (version) {
                    // 版本号应该符合语义化版本格式
                    expect(version).toMatch(/^\d+\.\d+\.\d+/);
                    console.log(`✓ Copilot version: ${version}`);
                } else {
                    console.log('ℹ Could not determine version');
                }
            }
        }, 10000);
    });
    
    describe('detectCopilot', () => {
        test('应该返回完整的检测结果', async () => {
            const result = await detectCopilot();
            
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
            
            if (result.success) {
                expect(result.path).toBeDefined();
                expect(result.details).toBeDefined();
                
                console.log('✓ Copilot detection successful:');
                console.log(`  Path: ${result.path}`);
                console.log(`  Version: ${result.details?.version || 'unknown'}`);
                console.log(`  Command: ${result.details?.command || 'unknown'}`);
            } else {
                expect(result.error).toBeDefined();
                console.log(`ℹ Copilot not detected: ${result.error}`);
            }
        }, 10000);
        
        test('失败时应该提供有用的错误信息', async () => {
            const result = await detectCopilot();
            
            if (!result.success) {
                expect(result.error).toBeDefined();
                expect(result.error).toContain('Copilot');
                // 应该包含安装建议
                expect(
                    result.error?.includes('install') ||
                    result.error?.includes('found')
                ).toBe(true);
            }
        });
    });
});

describe('Integration', () => {
    test('完整的检测流程应该连贯', async () => {
        // 1. 检测路径
        const path = await detectCopilotPath();
        
        // 2. 如果找到路径,验证它
        if (path) {
            const isValid = await validateCopilotBinary(path);
            expect(isValid).toBe(true);
            
            // 3. 获取版本
            const version = await getCopilotVersion(path);
            // 版本可能获取不到,但不应该抛出错误
            expect(version === null || typeof version === 'string').toBe(true);
        }
        
        // 4. 完整检测应该返回一致的结果
        const detection = await detectCopilot();
        
        if (path) {
            expect(detection.success).toBe(true);
            expect(detection.path).toBe(path);
        } else {
            expect(detection.success).toBe(false);
            expect(detection.error).toBeDefined();
        }
    }, 15000);
});
