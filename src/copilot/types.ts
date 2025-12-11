/**
 * Copilot集成类型定义
 */

/**
 * Copilot认证状态
 */
export interface CopilotAuthStatus {
    /** 是否已认证 */
    authenticated: boolean;
    /** GitHub用户名 */
    user?: string;
    /** 错误信息 */
    error?: string;
    /** 认证方法 */
    authMethod?: 'oauth' | 'token';
}

/**
 * Copilot扩展信息
 */
export interface CopilotExtensionInfo {
    /** 是否已安装 */
    installed: boolean;
    /** 版本号 */
    version?: string;
    /** 安装路径 */
    path?: string;
    /** 安装方式 */
    installMethod?: 'npm' | 'gh-extension';
}

/**
 * Copilot配置
 */
export interface CopilotConfig {
    /** Copilot CLI路径 */
    copilotPath?: string;
    /** 超时时间(毫秒) */
    timeout?: number;
    /** 是否启用调试模式 */
    debug?: boolean;
    /** 工作目录 */
    workDir?: string;
}

/**
 * Copilot消息基础接口
 */
export interface CopilotMessage {
    /** 消息类型 */
    type: string;
    /** 消息ID */
    id?: string;
    /** 时间戳 */
    timestamp?: number;
    [key: string]: any;
}

/**
 * Copilot助手消息
 */
export interface CopilotAssistantMessage extends CopilotMessage {
    type: 'assistant_message';
    /** 消息文本 */
    text: string;
    /** 消息内容 */
    content?: string;
}

/**
 * Copilot文件编辑消息
 */
export interface CopilotFileEditMessage extends CopilotMessage {
    type: 'file_edit';
    /** 文件列表 */
    files: Array<{
        path: string;
        content: string;
        operation?: 'create' | 'update' | 'delete';
    }>;
    /** 编辑描述 */
    description?: string;
    /** 是否成功 */
    success?: boolean;
    /** 结果信息 */
    result?: string;
}

/**
 * Copilot命令执行消息
 */
export interface CopilotCommandMessage extends CopilotMessage {
    type: 'command_execution';
    /** 命令 */
    command: string;
    /** 输出 */
    output?: string;
    /** 退出码 */
    exitCode?: number;
}

/**
 * Copilot思考消息
 */
export interface CopilotThinkingMessage extends CopilotMessage {
    type: 'thinking';
    /** 思考内容 */
    text: string;
}

/**
 * Copilot错误消息
 */
export interface CopilotErrorMessage extends CopilotMessage {
    type: 'error';
    /** 错误信息 */
    error: string;
    /** 错误消息 */
    message?: string;
}

/**
 * Copilot就绪消息
 */
export interface CopilotReadyMessage extends CopilotMessage {
    type: 'ready';
}

/**
 * 检测结果
 */
export interface DetectionResult {
    /** 是否成功 */
    success: boolean;
    /** 结果路径或信息 */
    path?: string;
    /** 错误信息 */
    error?: string;
    /** 详细信息 */
    details?: Record<string, any>;
}
