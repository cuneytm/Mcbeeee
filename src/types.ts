
export interface ServerConfig {
    isolation: boolean;
    apiKey: string;
    allowedPath: string;
    port: number;
    approveRequests: boolean;
}

export interface ServerState {
    isRunning: boolean;
    config: ServerConfig;
    logs: string[];
}

export interface ApprovalRequest {
    id: string;
    toolName: string;
    args: any;
}
