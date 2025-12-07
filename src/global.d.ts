export interface IpcRendererApi {
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => () => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    startServer: () => void;
    stopServer: () => void;
    updateConfig: (config: any) => void;
    resolveApproval: (id: string, approved: boolean) => void;
    pickDirectory: () => Promise<string | null>;
}

declare global {
    interface Window {
        ipcRenderer: IpcRendererApi;
    }
}
