---
title: GitHub Copilot CLI 使用指南
tags:
  - Copilot
  - CLI
  - AI
  - GitHub
  - 开发工具
created: 2025-12-10
updated: 2025-12-10
banner: "![[2025-12-10_21-42.png]]"
banner_x: 0.5
banner_y: 0.18
---
# GitHub Copilot CLI 使用指南

## 📋 概述

GitHub Copilot CLI 是一个命令行工具，可以直接在终端中使用 AI 帮助你编写、测试和调试代码。它将 GitHub Copilot 的强大功能带到命令行环境中。

## 🚀 安装

### 使用 npm 安装

```bash
npm install -g @github/copilot
```

安装完成后会显示 Copilot 的欢迎界面和版本信息：

- 显示 Copilot CLI 版本（如 Version 0.0.367）
- 显示欢迎信息和使用提示
- 提示使用 `/login` 登录
![[2025-12-10_21-40 1.png]]
## 🔐 登录认证

### 1. 启动登录流程

首次使用 Copilot CLI 时需要登录认证：

```bash
# 启动 Copilot CLI
copilot

# 输入登录命令
> /login
```

**终端显示**：
```text
Welcome to GitHub
 _____ ___  ____  ___ _    ___ _____
/ ____|   \|  _ \|_ _| |  / _ \_   _|
| |   | || | |_) || || | | | | || |  
| |___| || |  __/ | || |_| |_| || |  
\_____|___/|_|   |___|____\___/ |_|  

CLI Version 0.0.367
Version 0.0.367 • Commit 9b421b4

Copilot can write, test and debug code right from your terminal.
Describe a task to get started or enter ? for help. Copilot uses AI, check for mistakes.

Please use /login to sign in to use Copilot
```

### 2. 选择账户类型

执行 `/login` 后，系统会提示选择登录账户：
![[2025-12-10_21-42 1.png]]
```text
What account do you want to log into?

> 1. GitHub.com
  2. GitHub Enterprise Cloud with data residency (*.ghe.com)

Confirm with number keys or ↑↓ keys and Enter
```
![[2025-12-10_21-42_1 1.png]]
**选项说明**：
1. **GitHub.com** - 个人 GitHub 账户（推荐）
2. **GitHub Enterprise Cloud** - 企业账户（*.ghe.com）

使用数字键或方向键选择，按 Enter 确认。

### 3. 设备授权

选择账户后，系统会生成一个授权码和授权链接：

```text
⏳ Waiting for authorization...

Enter one-time code: 2EA9-619A at https://github.com/login/device

Press any key to copy to clipboard and open browser...
```
![[2025-12-10_21-43 1.png]]
**操作步骤**：

1. 记下一次性授权码（如 `2EA9-619A`）
2. 按任意键，系统会自动复制授权码并打开浏览器
3. 在浏览器中访问 <https://github.com/login/device>
4. 粘贴或输入授权码
5. 授权 Copilot CLI 访问你的 GitHub 账户

> ⚠️ **注意**：授权码有时效性，通常在 15 分钟内有效。

### 4. 登录成功

授权完成后，终端会显示成功消息：

```text
● Connected to GitHub MCP Server
● Signed in successfully as WingBot! You can now use Copilot.
```
现在你可以开始使用 Copilot CLI 了！🎉

### 5. 远程主机安装


## ⚙️ 配置

### 选择 AI 模型

使用 `/model` 命令可以查看和切换不同的 AI 模型：
![[2025-12-10_21-45_1 1.png]]

```bash
> /model [model]
```

**终端显示**：
```text
/model [model]          Select AI model to use
```

系统会提示模型切换成功：
```text
● Model changed to: claude-sonnet-4.5. The new model will be used for the next conversation.
```

**可选模型**：

- **Claude Sonnet 4.5** - Anthropic 的强大模型，适合复杂代码分析
- **GPT-4** - OpenAI 的模型，适合通用任务
- 其他可用模型（根据订阅级别）

> 💡 **提示**：不同模型有不同的优势，可以根据任务类型选择合适的模型。

## 🎯 基本使用

### 可用命令

启动 Copilot 后，输入命令前缀 `/` 可以使用各种管理命令。输入 `/help` 查看完整帮助。

**终端显示的命令列表**：
```text
> /add-dir

/add-dir <directory>         Add a directory to the allowed list for file access
/agent                       Browse and select from available agents (if any)
/clear                       Clear the conversation history
/cwd [directory]             Change working directory or show current directory
/delegate <prompt>           Delegate changes to remote repository with AI-generated PR
/exit, /quit                 Exit the CLI
/share [file|gist] [path]    Share session to markdown file or GitHub gist
/feedback                    Provide feedback about the CLI
/help                        Show help for interactive commands
/list-dirs                   Display all allowed directories for file access
```

**常用命令**：

| 命令 | 说明 |
|------|------|
| `/add-dir <directory>` | 添加目录到文件访问许可列表 |
| `/agent` | 从可用代理列表中选择（如果有） |
| `/clear` | 清除对话历史 |
| `/cwd [directory]` | 更改或显示当前工作目录 |
| `/delegate <prompt>` | 将更改委托到远程仓库（AI 生成的 PR） |
| `/exit` 或 `/quit` | 退出 CLI |
| `/share [file\|gist] [path]` | 分享会话到 Markdown 文件或 GitHub Gist |
| `/feedback` | 提供关于 CLI 的反馈 |
| `/help` | 显示交互式命令帮助 |
| `/list-dirs` | 显示所有允许的文件访问目录 |
| `/login` | 登录到 Copilot |
| `/logout` | 登出 |
| `/model [model]` | 选择要使用的 AI 模型 |

## 💡 使用技巧

### 1. 上下文管理

- 使用 `/cwd` 设置工作目录，让 Copilot 了解项目结构
- 使用 `/add-dir` 添加相关目录，提供更多上下文
- 使用 `/clear` 清除历史，开始新的对话

### 2. 高效提问

**好的提问方式**：
```bash
> 创建一个 Express API 端点，接收 POST 请求，验证 email 格式，并保存到 MongoDB
```

**避免模糊提问**：
```bash
> 帮我写代码
```

### 3. 迭代改进

如果第一次的回答不满意，可以继续追问：

```bash
> 能否添加错误处理？
> 使用 async/await 重写这段代码
> 添加注释说明每个步骤
```

### 4. 结合模型选择

- **Claude Sonnet 4.5**：适合复杂的代码架构和详细解释
- **GPT-4**：适合快速原型开发和通用任务

### 5. 工作流集成

```bash
# 示例工作流
> /cwd /home/user/my-project
> /add-dir src
> /add-dir tests
> 分析 src/main.py 并提出改进建议
> 为 main.py 中的函数编写单元测试
> /share gist  # 保存讨论结果
```

## 🔧 常见问题

### 1. 登录超时

如果授权码过期：
```bash
> /logout
> /login
```
重新生成新的授权码。

### 2. 无法访问文件

使用 `/add-dir` 添加目录权限：
```bash
> /add-dir /path/to/your/project
> /list-dirs  # 查看已授权目录
```

### 3. 切换账户

```bash
> /logout
> /login
```
重新选择账户类型登录。

### 4. 模型不可用

某些模型可能需要特定的订阅或权限。使用 `/model` 查看可用模型列表。

## 📚 最佳实践

### 1. 项目初始化

```bash
> /cwd /path/to/project
> /add-dir src
> /add-dir config
> 介绍一下这个项目的结构
```

### 2. 代码审查

```bash
> 审查 src/api.js，检查安全性问题
> 这段代码的性能如何优化？
```

### 3. 文档生成

```bash
> 为 main.py 生成 README 文档
> 为这个 API 生成 OpenAPI 规范
```

### 4. 学习新技术

```bash
> 如何使用 Docker Compose 部署这个应用？
> WebSocket 和 HTTP 长轮询的区别是什么？
```

## 🔗 相关资源

- [GitHub Copilot 官方文档](https://docs.github.com/en/copilot)
- [Copilot CLI GitHub 仓库](https://github.com/github/copilot-cli)
- [GitHub Copilot 订阅](https://github.com/features/copilot)

## 🔗 相关链接

- [[Home]]
- [[AI编程]]
---

**创建时间**: 2025-12-10  
**最后更新**: 2025-12-10  
**作者**: CZZR
