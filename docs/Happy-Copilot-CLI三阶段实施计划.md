# Happy-Copilot-CLI 三阶段实施计划

## 📋 总体规划

| 阶段 | 名称 | 时间 | 核心目标 | 可验证成果 |
|------|------|------|----------|------------|
| **阶段一** | 基础设施搭建 | 3天 | 建立基本通信能力 | CLI能检测并连接Copilot |
| **阶段二** | 核心功能实现 | 4天 | 实现双向消息转发 | 手机可控制Copilot编辑代码 |
| **阶段三** | 优化与发布 | 3天 | 完善体验和稳定性 | 正式发布可用版本 |

---

## 🎯 阶段一：基础设施搭建 (Day 1-3)

### 目标
建立 Copilot 检测、认证和基本连接能力,为后续功能打下基础。

### 任务清单

#### Day 1: 项目结构与工具类
- [ ] **T1.1** 创建目录结构
  ```bash
  mkdir -p happy-cli/src/copilot/utils
  mkdir -p happy-cli/src/copilot/__tests__
  ```
  
- [ ] **T1.2** 实现 `types.ts` - 类型定义
  - `CopilotAuthStatus` 接口
  - `CopilotMessage` 接口
  - `CopilotConfig` 接口
  - 预计代码量: ~80 行

- [ ] **T1.3** 实现 `authChecker.ts` - 认证检查
  - `checkCopilotAuth()` - 检查 gh auth 状态
  - `checkCopilotExtension()` - 检查扩展安装
  - `validateCopilotAccess()` - 验证访问权限
  - 预计代码量: ~150 行

- [ ] **T1.4** 编写单元测试
  ```typescript
  // __tests__/authChecker.test.ts
  describe('Copilot Auth Checker', () => {
    test('检测已认证状态', async () => {
      const status = await checkCopilotAuth();
      expect(status.authenticated).toBeDefined();
    });
    
    test('检测扩展安装', async () => {
      const installed = await checkCopilotExtension();
      expect(typeof installed).toBe('boolean');
    });
  });
  ```

#### Day 2: Copilot 路径检测与进程管理
- [ ] **T2.1** 实现 `copilotDetector.ts` - 路径检测
  - `detectCopilotPath()` - 多策略检测
  - `validateCopilotBinary()` - 验证可执行文件
  - `getCopilotVersion()` - 获取版本信息
  - 预计代码量: ~200 行

- [ ] **T2.2** 实现基础 MCP 客户端框架
  - `CopilotMcpClient` 类骨架
  - 进程启动逻辑 `spawn()`
  - stdio 管道建立
  - 预计代码量: ~100 行

- [ ] **T2.3** 编写集成测试
  ```typescript
  // __tests__/copilotDetector.test.ts
  describe('Copilot Detector', () => {
    test('检测到 Copilot 路径', async () => {
      const path = await detectCopilotPath();
      expect(path).toBeTruthy();
    });
    
    test('验证二进制文件', async () => {
      const path = await detectCopilotPath();
      const valid = await validateCopilotBinary(path);
      expect(valid).toBe(true);
    });
  });
  ```

#### Day 3: 基础连接与错误处理
- [ ] **T3.1** 完善 `CopilotMcpClient` 连接逻辑
  - `connect()` - 建立连接
  - `disconnect()` - 关闭连接
  - `handleStdout()` - 处理标准输出
  - `handleStderr()` - 处理错误输出
  - 预计代码量: ~200 行

- [ ] **T3.2** 实现错误处理器
  - `CopilotErrorHandler` 类
  - 错误类型分类
  - 友好错误消息生成
  - 预计代码量: ~120 行

- [ ] **T3.3** 实现命令行入口骨架
  - 在 `src/index.ts` 添加 `copilot` 子命令
  - 基础参数解析
  - 认证流程调用
  - 预计代码量: ~80 行

- [ ] **T3.4** 端到端测试 - 基础连接
  ```bash
  # 测试脚本: test-phase1.sh
  #!/bin/bash
  echo "=== Phase 1 E2E Test ==="
  
  # 测试1: 检查认证
  node dist/copilot/utils/authChecker.js
  
  # 测试2: 检测路径
  node dist/copilot/utils/copilotDetector.js
  
  # 测试3: 启动连接(立即关闭)
  timeout 5s happy copilot --test-connection
  ```

### 验收标准 ✅

- [ ] 所有单元测试通过 (覆盖率 > 80%)
- [ ] CLI 能正确检测 Copilot 认证状态
- [ ] CLI 能自动发现 Copilot 可执行文件路径
- [ ] 能成功启动 Copilot 进程并建立 stdio 连接
- [ ] 错误消息清晰友好,包含解决建议
- [ ] 代码通过 lint 和 type check

### 预期输出示例

```bash
$ happy copilot --check

🔍 Checking GitHub Copilot setup...

✅ GitHub CLI (gh): Found at /usr/local/bin/gh
✅ GitHub Auth: Logged in as @username
✅ Copilot Extension: Installed (v1.2.3)
✅ Copilot CLI: Found at ~/.local/share/gh/extensions/gh-copilot

🎉 All checks passed! Ready to use Copilot.

Run 'happy copilot' to start.
```

### 技术风险与缓解

| 风险 | 影响 | 缓解措施 | 负责人 |
|------|------|----------|--------|
| Copilot CLI 路径不标准 | 高 | 实现多策略检测,支持手动指定 | 开发 |
| 进程启动失败 | 中 | 添加详细日志,超时重试机制 | 开发 |
| 认证 token 过期 | 低 | 检测过期并提示重新认证 | 开发 |

---

## 🚀 阶段二：核心功能实现 (Day 4-7)

### 目标
实现完整的消息桥接、文件编辑和权限控制,达到可用的 MVP 状态。

### 任务清单

#### Day 4: MCP 消息解析与转换
- [ ] **T4.1** 完善 `CopilotMcpClient` 消息处理
  - `sendPrompt()` - 发送提示词
  - `abort()` - 中止执行
  - `waitForReady()` - 等待就绪信号
  - 消息事件发射器
  - 预计代码量: ~180 行

- [ ] **T4.2** 实现 `messageTranslator.ts` - 消息格式转换
  - `copilotToHappy()` - Copilot 消息转 Happy 格式
  - `happyToCopilot()` - Happy 消息转 Copilot 格式
  - 消息类型映射表
  - 预计代码量: ~200 行

- [ ] **T4.3** 单元测试 - 消息转换
  ```typescript
  describe('Message Translator', () => {
    test('转换 Copilot assistant_message', () => {
      const input = { type: 'assistant_message', text: 'Hello' };
      const output = copilotToHappy(input);
      expect(output.type).toBe('message');
      expect(output.message).toBe('Hello');
    });
    
    test('转换 file_edit 消息', () => {
      const input = { 
        type: 'file_edit', 
        files: [{ path: 'test.js', content: '...' }]
      };
      const output = copilotToHappy(input);
      expect(output.type).toBe('tool-call');
      expect(output.name).toBe('CopilotEdit');
    });
  });
  ```

#### Day 5: 消息桥接实现
- [ ] **T5.1** 实现 `copilotBridge.ts` - 核心桥接逻辑
  - `CopilotBridge` 类
  - `handleUserMessage()` - 处理用户消息
  - `handleMcpMessage()` - 处理 MCP 消息
  - `handleAssistantMessage()` - 处理助手回复
  - 预计代码量: ~250 行

- [ ] **T5.2** 实现消息队列管理
  - `pendingPrompts` 队列
  - `processMessages()` - 批处理逻辑
  - 流控与背压处理
  - 预计代码量: ~100 行

- [ ] **T5.3** 集成测试 - 消息流转
  ```typescript
  describe('Copilot Bridge', () => {
    test('端到端消息流转', async () => {
      const mockSession = createMockSession();
      const mockClient = createMockMcpClient();
      const bridge = new CopilotBridge(mockSession, mockClient, buffer);
      
      // 模拟用户消息
      await bridge.handleUserMessage('Hello');
      
      // 验证发送到 Copilot
      expect(mockClient.sendPrompt).toHaveBeenCalledWith('Hello');
      
      // 模拟 Copilot 响应
      mockClient.emit('message', { type: 'assistant_message', text: 'Hi' });
      
      // 验证转发到 session
      await delay(100);
      expect(mockSession.sendCodexMessage).toHaveBeenCalled();
    });
  });
  ```

#### Day 6: 文件编辑与权限控制
- [ ] **T6.1** 实现 `handleFileEdit()` - 文件编辑处理
  - 解析文件编辑请求
  - 生成权限审批请求
  - 等待用户批准
  - 执行或拒绝编辑
  - 预计代码量: ~150 行

- [ ] **T6.2** 复用权限控制机制
  - 参考 `codex/utils/permissionHandler.ts`
  - 适配 Copilot 消息格式
  - 实现超时处理
  - 预计代码量: ~120 行

- [ ] **T6.3** 实现 `handleCommandExecution()` - 命令执行
  - 解析命令执行请求
  - 权限检查
  - 输出捕获与转发
  - 预计代码量: ~130 行

- [ ] **T6.4** 集成测试 - 文件编辑流程
  ```typescript
  describe('File Edit Flow', () => {
    test('用户批准编辑', async () => {
      const bridge = createBridge();
      
      // 模拟文件编辑请求
      const editMsg = {
        type: 'file_edit',
        files: [{ path: 'test.js', content: 'new content' }]
      };
      
      // 应该发送审批请求
      await bridge.handleMcpMessage(editMsg);
      expect(mockSession.sendApprovalRequest).toHaveBeenCalled();
      
      // 模拟用户批准
      await bridge.handleApproval({ approved: true, id: 'req-1' });
      
      // 应该执行编辑
      expect(mockClient.approveEdit).toHaveBeenCalled();
    });
  });
  ```

#### Day 7: 主运行器与 UI 集成
- [ ] **T7.1** 实现 `runCopilot.ts` - 主入口
  - 认证流程编排
  - 会话创建
  - 组件初始化
  - 主循环逻辑
  - 清理与退出
  - 预计代码量: ~350 行

- [ ] **T7.2** 实现 `CopilotDisplay.tsx` - UI 组件
  - 参考 `CodexDisplay.tsx`
  - 消息展示
  - 状态指示
  - 实时更新
  - 预计代码量: ~200 行

- [ ] **T7.3** 集成到 `src/index.ts`
  - 添加 `copilot` 子命令分支
  - 参数解析
  - 错误处理
  - 预计代码量: ~50 行

- [ ] **T7.4** 端到端测试 - 完整流程
  ```bash
  # 测试脚本: test-phase2.sh
  #!/bin/bash
  set -e
  
  echo "=== Phase 2 E2E Test ==="
  
  # 准备测试项目
  mkdir -p /tmp/copilot-test
  cd /tmp/copilot-test
  echo "console.log('test');" > index.js
  
  # 启动 happy copilot (后台)
  happy copilot &
  COPILOT_PID=$!
  
  # 等待初始化
  sleep 5
  
  # 通过 API 发送测试消息
  curl -X POST http://localhost:8080/api/test/send-message \
    -H "Content-Type: application/json" \
    -d '{"text": "在 index.js 中添加注释"}'
  
  # 等待处理
  sleep 3
  
  # 验证文件变更(应该有 diff)
  git diff index.js > /tmp/diff.txt
  if [ -s /tmp/diff.txt ]; then
    echo "✅ 文件编辑成功"
  else
    echo "❌ 文件未被编辑"
    exit 1
  fi
  
  # 清理
  kill $COPILOT_PID
  rm -rf /tmp/copilot-test
  ```

### 验收标准 ✅

- [ ] 手机可发送消息到 CLI
- [ ] CLI 将消息转发给 Copilot
- [ ] Copilot 响应正确转发到手机
- [ ] 文件编辑请求触发手机端审批
- [ ] 批准后文件正确修改
- [ ] 拒绝后不执行操作
- [ ] UI 实时显示所有消息
- [ ] 所有集成测试通过
- [ ] 端到端测试成功

### 预期输出示例

```bash
$ happy copilot

┌────────────────────────────────────┐
│  🤖 GitHub Copilot via Happy       │
│  Status: Connected ✅              │
│  Session: abc-123                  │
└────────────────────────────────────┘

👤 You: 创建一个 Hello World 组件
🤖 Copilot: 我将为您创建一个 React 组件...
🔧 Editing: src/components/HelloWorld.tsx

📱 [Approval Required]
   ├─ File: src/components/HelloWorld.tsx
   ├─ Action: Create new file
   └─ Waiting for approval on phone...

✅ Approved by phone
📄 File created successfully

👤 You: 添加 props 类型定义
🤖 Copilot: 我将添加 TypeScript 接口...
🔧 Editing: src/components/HelloWorld.tsx
✅ File updated

Press Ctrl+C to exit
```

### 技术风险与缓解

| 风险 | 影响 | 缓解措施 | 负责人 |
|------|------|----------|--------|
| 消息格式不兼容 | 高 | 添加版本检测,实现适配层 | 开发 |
| 权限审批超时 | 中 | 设置合理超时,自动拒绝 | 开发 |
| 进程意外退出 | 中 | 添加进程监控,自动重启 | 开发 |
| 大文件编辑卡顿 | 低 | 实现增量 diff,压缩传输 | 优化 |

---

## 💎 阶段三：优化与发布 (Day 8-10)

### 目标
完善用户体验、提升稳定性、编写文档并正式发布。

### 任务清单

#### Day 8: 性能优化与边界处理
- [ ] **T8.1** 性能优化
  - 消息批处理 (合并 100ms 内消息)
  - 大文件增量 diff (使用 `diff-match-patch`)
  - WebSocket 压缩 (启用 `permessage-deflate`)
  - 本地缓存文件内容
  - 预计代码量: ~200 行

- [ ] **T8.2** 边界情况处理
  - 网络中断重连逻辑
  - Copilot 进程崩溃恢复
  - 认证 token 过期检测
  - 磁盘空间不足处理
  - 预计代码量: ~150 行

- [ ] **T8.3** 日志与调试增强
  - 结构化日志输出
  - 调试模式 (`DEBUG=happy:copilot`)
  - 性能指标收集
  - 预计代码量: ~100 行

- [ ] **T8.4** 压力测试
  ```typescript
  // __tests__/stress.test.ts
  describe('Stress Test', () => {
    test('处理 100 条连续消息', async () => {
      const bridge = createBridge();
      
      for (let i = 0; i < 100; i++) {
        await bridge.handleUserMessage(`Message ${i}`);
      }
      
      // 等待全部处理
      await waitForQueueEmpty(bridge, 30000);
      
      expect(bridge.getProcessedCount()).toBe(100);
    });
    
    test('大文件编辑 (10MB)', async () => {
      const largeContent = 'x'.repeat(10 * 1024 * 1024);
      const editMsg = {
        type: 'file_edit',
        files: [{ path: 'large.txt', content: largeContent }]
      };
      
      const startTime = Date.now();
      await bridge.handleMcpMessage(editMsg);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // 5秒内完成
    });
  });
  ```

#### Day 9: 用户体验优化与文档
- [ ] **T9.1** 首次使用引导
  - 检测未认证状态
  - 显示友好的设置指南
  - 提供快速设置命令
  - 预计代码量: ~100 行

- [ ] **T9.2** 错误消息优化
  - 分类错误类型 (认证/网络/配置/未知)
  - 提供具体解决方案
  - 添加帮助文档链接
  - 预计代码量: ~150 行

- [ ] **T9.3** 编写用户文档
  - README 更新 (添加 Copilot 章节)
  - 快速开始指南
  - 配置参考
  - 故障排除
  - 预计文档量: ~500 行

- [ ] **T9.4** 编写开发者文档
  - 架构设计文档
  - API 参考
  - 贡献指南
  - 测试指南
  - 预计文档量: ~800 行

#### Day 10: 最终测试与发布
- [ ] **T10.1** 最终回归测试
  ```bash
  # 运行所有测试套件
  yarn test:all
  
  # 测试覆盖率检查 (目标 > 70%)
  yarn test:coverage
  
  # 集成测试
  yarn test:integration
  
  # 端到端测试 (真实环境)
  yarn test:e2e
  ```

- [ ] **T10.2** 跨平台测试
  - [ ] macOS (Intel + Apple Silicon)
  - [ ] Linux (Ubuntu 22.04, Arch)
  - [ ] Windows (WSL2)

- [ ] **T10.3** Beta 用户测试
  - 招募 5-10 位内部测试用户
  - 收集反馈
  - 修复关键问题
  - 更新文档

- [ ] **T10.4** 版本发布
  ```bash
  # 更新版本号
  npm version 0.11.0 -m "feat: Add GitHub Copilot integration"
  
  # 构建
  yarn build
  
  # 测试发布包
  npm pack
  npm install -g ./happy-coder-0.11.0.tgz
  
  # 正式发布
  npm publish
  
  # 创建 Git tag
  git push origin v0.11.0
  
  # 创建 GitHub Release
  gh release create v0.11.0 \
    --title "v0.11.0 - Copilot Integration" \
    --notes-file RELEASE_NOTES.md
  ```

- [ ] **T10.5** 发布公告
  - GitHub Release Notes
  - 项目 README 更新
  - Discord 社区公告
  - Twitter/X 推文

### 验收标准 ✅

- [ ] 所有自动化测试通过 (单元+集成+E2E)
- [ ] 测试覆盖率 ≥ 70%
- [ ] 至少在 2 个平台测试成功
- [ ] 文档完整且准确
- [ ] 至少 3 位 beta 用户验证成功
- [ ] 无已知的 P0/P1 级别 bug
- [ ] npm 包成功发布
- [ ] GitHub Release 创建完成

### 预期输出示例 - 首次使用

```bash
$ happy copilot

👋 Welcome to GitHub Copilot via Happy!

Let's check your setup...

✅ GitHub CLI (gh) - Found
❌ GitHub Authentication - Not logged in
❌ Copilot Extension - Not installed

📝 Setup Instructions:

Step 1: Authenticate with GitHub
  $ gh auth login

Step 2: Install Copilot Extension
  $ gh extension install github/gh-copilot

Step 3: Run Happy Copilot again
  $ happy copilot

Need help? Visit: https://docs.happy.dev/copilot
```

### 性能指标目标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 消息延迟 | < 2 秒 | 用户发送到 Copilot 响应 |
| 启动时间 | < 5 秒 | 命令执行到会话就绪 |
| 内存占用 | < 200MB | 运行 1 小时后 |
| CPU 占用 | < 10% | 空闲时平均值 |
| 测试覆盖率 | > 70% | Jest coverage report |

---

## 📊 整体进度追踪

### 每日 Stand-up 模板

```markdown
## Day X - [日期]

### 昨日完成 ✅
- [ ] 任务 1
- [ ] 任务 2

### 今日计划 🎯
- [ ] 任务 3
- [ ] 任务 4

### 遇到的问题 🚧
- 问题描述
- 解决方案/需要帮助

### 风险预警 ⚠️
- 潜在风险
- 缓解措施
```

### 里程碑检查点

| 检查点 | 时间 | 验证内容 | 负责人 |
|--------|------|----------|--------|
| **Checkpoint 1** | Day 3 EOD | 基础连接测试通过 | 开发 |
| **Checkpoint 2** | Day 5 EOD | 消息流转测试通过 | 开发 |
| **Checkpoint 3** | Day 7 EOD | 完整流程演示成功 | 开发+测试 |
| **Checkpoint 4** | Day 9 EOD | 文档审核通过 | 技术写作 |
| **Final Review** | Day 10 | 发布前最终审核 | 全员 |

---

## 🧪 测试策略总览

### 测试金字塔

```
         /\
        /E2E\        10% - 端到端测试 (5-10 个场景)
       /------\
      /集成测试 \     30% - 集成测试 (20-30 个用例)
     /----------\
    /  单元测试   \   60% - 单元测试 (100+ 个用例)
   /--------------\
```

### 关键测试场景

#### 单元测试 (60%)
- [ ] 所有工具函数 (auth, detector, translator)
- [ ] MCP 客户端消息解析
- [ ] 消息格式转换逻辑
- [ ] 错误处理分支
- [ ] 边界值测试

#### 集成测试 (30%)
- [ ] MCP 客户端与 Copilot 进程交互
- [ ] Bridge 与 Session 交互
- [ ] 权限审批流程
- [ ] 文件编辑流程
- [ ] 命令执行流程

#### 端到端测试 (10%)
- [ ] 首次使用完整流程
- [ ] 简单文件编辑 (添加注释)
- [ ] 复杂重构 (重命名+移动文件)
- [ ] 命令执行 (运行测试)
- [ ] 错误恢复 (网络中断)
- [ ] 多轮对话
- [ ] 会话中断与恢复
- [ ] 权限拒绝场景
- [ ] Ctrl+C 优雅退出
- [ ] 长时间运行稳定性

### 自动化测试脚本

```bash
# scripts/run-all-tests.sh
#!/bin/bash
set -e

echo "🧪 Running Complete Test Suite..."

# 1. Lint
echo "📝 Running linter..."
yarn lint

# 2. Type Check
echo "🔍 Type checking..."
yarn tsc --noEmit

# 3. Unit Tests
echo "🔬 Running unit tests..."
yarn test:unit --coverage

# 4. Integration Tests
echo "🔗 Running integration tests..."
yarn test:integration

# 5. E2E Tests
echo "🌐 Running E2E tests..."
yarn test:e2e

# 6. Coverage Report
echo "📊 Generating coverage report..."
yarn test:coverage-report

echo "✅ All tests passed!"
```

---

## 📦 交付物清单

### 代码交付
- [ ] `src/copilot/` - 核心模块 (~2000 行)
- [ ] `src/copilot/utils/` - 工具类 (~800 行)
- [ ] `src/copilot/__tests__/` - 测试代码 (~1500 行)
- [ ] `src/ui/ink/CopilotDisplay.tsx` - UI 组件 (~200 行)
- [ ] `src/index.ts` - 入口修改 (~50 行)

### 文档交付
- [ ] README.md - 更新 Copilot 章节
- [ ] docs/copilot-guide.md - 使用指南
- [ ] docs/copilot-architecture.md - 架构文档
- [ ] docs/troubleshooting-copilot.md - 故障排除
- [ ] CHANGELOG.md - 版本日志

### 测试交付
- [ ] 单元测试套件 (100+ 用例)
- [ ] 集成测试套件 (20+ 用例)
- [ ] E2E 测试套件 (10 场景)
- [ ] 测试覆盖率报告 (>70%)

### 发布交付
- [ ] npm 包 v0.11.0
- [ ] GitHub Release v0.11.0
- [ ] Release Notes
- [ ] Migration Guide (如需要)

---

## 🎓 开发团队准备

### 所需技能
- TypeScript/Node.js 开发经验
- 进程管理与 IPC 通信
- 测试驱动开发 (TDD)
- Git 版本控制
- 文档编写能力

### 开发环境
```bash
# 安装依赖
yarn install

# 启用调试模式
export DEBUG=happy:*

# 启动开发构建
yarn dev

# 运行测试 (watch 模式)
yarn test:watch
```

### 推荐工具
- **IDE**: VS Code + Copilot 扩展
- **调试**: Chrome DevTools (Node.js)
- **测试**: Vitest + Testing Library
- **Mock**: MSW (Mock Service Worker)
- **监控**: Node.js Inspector

---

## 🔒 质量保证

### Code Review Checklist
- [ ] 代码符合项目规范 (ESLint)
- [ ] 类型定义完整 (TypeScript)
- [ ] 函数有清晰的注释
- [ ] 错误处理健壮
- [ ] 测试覆盖关键路径
- [ ] 无 console.log 等调试代码
- [ ] 性能考虑合理
- [ ] 安全风险评估

### 发布前检查
- [ ] 所有 TODO 已清理
- [ ] 版本号正确更新
- [ ] Changelog 准确完整
- [ ] 文档同步更新
- [ ] Breaking Changes 标记
- [ ] Migration Guide 提供
- [ ] Beta 测试反馈处理
- [ ] 回滚方案就绪

---

## 📞 支持与反馈

### 问题报告
- GitHub Issues: https://github.com/slopus/happy-cli/issues
- 标签: `feature:copilot`, `bug`, `documentation`

### 社区讨论
- Discord: #happy-copilot-dev
- 每日 15:00 同步会议

### 紧急联系
- 技术负责人: @tech-lead
- 产品负责人: @product-owner

---

**文档版本**: v1.0  
**创建日期**: 2024-12-11  
**最后更新**: 2024-12-11  
**作者**: GitHub Copilot + Happy Team  
**审核**: Pending

---

## 附录 A: 快速参考命令

```bash
# 开发
yarn dev              # 开发模式构建
yarn build            # 生产构建
yarn test             # 运行所有测试
yarn test:watch       # Watch 模式测试
yarn lint             # 代码检查
yarn format           # 代码格式化

# 调试
DEBUG=happy:copilot happy copilot          # 启用调试日志
DEBUG=* happy copilot                       # 所有调试日志
happy copilot --log-level trace            # 追踪级别日志

# 测试
yarn test:unit                              # 单元测试
yarn test:integration                       # 集成测试
yarn test:e2e                              # 端到端测试
yarn test:coverage                         # 覆盖率报告

# 发布
npm version [patch|minor|major]            # 升级版本
npm publish                                 # 发布到 npm
gh release create v0.11.0                  # 创建 GitHub Release
```

## 附录 B: 常见问题 FAQ

**Q: Copilot CLI 找不到怎么办?**  
A: 运行 `gh extension install github/gh-copilot` 安装扩展。

**Q: 认证失败如何处理?**  
A: 运行 `gh auth login` 重新认证,确保有 Copilot 访问权限。

**Q: 如何查看详细日志?**  
A: 使用 `DEBUG=happy:copilot happy copilot` 启用调试模式。

**Q: 手机端看不到消息?**  
A: 检查 WebSocket 连接状态,确保 Happy Server 正在运行。

**Q: 文件编辑不生效?**  
A: 检查文件权限,查看是否有审批请求被拒绝。
