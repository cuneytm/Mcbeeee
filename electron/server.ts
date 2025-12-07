
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { BrowserWindow, Notification } from "electron";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import cors from 'cors';

export interface ServerConfig {
    isolation: boolean;
    apiKey: string;
    allowedPath: string;
    port: number;
    approveRequests: boolean;
}

export class McpService {
    private server: Server;
    private expressApp: express.Express | null = null;
    private httpServer: any = null;
    private transports = new Map<string, SSEServerTransport>();

    public state: {
        isRunning: boolean;
        config: ServerConfig;
        logs: string[];
    } = {
            isRunning: false,
            config: {
                isolation: true,
                apiKey: "",
                allowedPath: "",
                port: 3000,
                approveRequests: true
            },
            logs: []
        };

    private pendingRequests = new Map<string, (approved: boolean) => void>();

    constructor(private mainWindow: BrowserWindow) {
        this.server = new Server(
            { name: "fileagent-electron", version: "1.0.0" },
            { capabilities: { tools: {} } }
        );

        this.setupTools();
    }

    private log(message: string, type: 'info' | 'error' | 'request' = 'info') {
        const entry = `[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${message}`;
        this.state.logs.push(entry);
        if (this.state.logs.length > 100) this.state.logs.shift();
        if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('log-update', entry);
        }
    }

    private async requestApproval(toolName: string, args: any): Promise<boolean> {
        const id = randomUUID();
        this.log(`Requesting approval for ${toolName}`, 'request');

        // Send native macOS notification with action buttons
        const notification = new Notification({
            title: 'MCBeeee - Approval Required',
            body: `Agent wants to execute: ${toolName}\n${JSON.stringify(args, null, 2).substring(0, 100)}`,
            silent: false,
            urgency: 'critical',
            timeoutType: 'never', // Keep in notification center
            actions: [
                {
                    type: 'button',
                    text: 'Approve'
                },
                {
                    type: 'button',
                    text: 'Deny'
                }
            ],
            closeButtonText: 'Close'
        });

        return new Promise((resolve) => {
            // Store resolver
            this.pendingRequests.set(id, resolve);

            // Handle notification action button clicks
            notification.on('action', (_event, index) => {
                const approved = index === 0; // 0 = Approve, 1 = Deny
                console.log(`[Server] Notification action clicked: ${approved ? 'Approve' : 'Deny'} for ${id}`);
                this.log(`Notification action: ${approved ? 'APPROVED' : 'DENIED'}`, 'info');
                this.resolveApproval(id, approved);
            });

            // Handle notification body click - show in-app modal
            notification.on('click', () => {
                console.log('[Server] Notification body clicked - showing in-app modal');
                if (!this.mainWindow.isDestroyed()) {
                    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }
            });

            // Handle notification close (auto-deny if not already resolved)
            notification.on('close', () => {
                if (this.pendingRequests.has(id)) {
                    console.log('[Server] Notification closed - auto-denying');
                    this.resolveApproval(id, false);
                }
            });

            notification.on('show', () => {
                console.log('[Server] Notification shown successfully');
            });

            notification.on('failed', (error) => {
                console.error('[Server] Notification failed:', error);
            });

            notification.show();

            // Send to UI immediately as fallback (in case notification actions don't work or notification is not supported)
            this.mainWindow.webContents.send('request-approval', { id, toolName, args });
        });
    }

    public resolveApproval(id: string, approved: boolean) {
        const resolver = this.pendingRequests.get(id);
        if (resolver) {
            resolver(approved);
            this.pendingRequests.delete(id);
            this.log(`Request ${id} ${approved ? 'APPROVED' : 'DENIED'}`, 'info');

            // Close the in-app modal if it's still open
            if (!this.mainWindow.isDestroyed()) {
                console.log(`[Server] Sending close-approval event for ${id}`);
                this.mainWindow.webContents.send('close-approval', id);
            }
        } else {
            console.log(`[Server] No pending request found for ${id}`);
        }
    }

    private setupTools() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "list_directory",
                    description: "List files and folders on the user's local computer within the allowed directory. Use this to see what files are available.",
                    inputSchema: { type: "object", properties: { subpath: { type: "string" } } }
                },
                {
                    name: "read_file",
                    description: "Read the contents of a file from the user's local computer.",
                    inputSchema: { type: "object", properties: { subpath: { type: "string" } }, required: ["subpath"] }
                },
                {
                    name: "write_file",
                    description: "Write to a file",
                    inputSchema: { type: "object", properties: { subpath: { type: "string" }, content: { type: "string" } }, required: ["subpath", "content"] }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            // Security Check: Approval
            if (this.state.config.approveRequests) {
                const approved = await this.requestApproval(request.params.name, request.params.arguments);
                if (!approved) throw new McpError(ErrorCode.InvalidRequest, "User denied this request");
            }

            // Validate Root Path
            const rootPath = this.state.config.allowedPath;
            if (!rootPath) throw new McpError(ErrorCode.InvalidRequest, "No Allowed Directory configured");

            try {
                const checkPath = (sub: string) => {
                    const p = sub ? path.join(rootPath, sub) : rootPath;
                    if (!p.startsWith(rootPath)) throw new Error("Path traversal detected");
                    return p;
                };

                switch (request.params.name) {
                    case "list_directory": {
                        const args = z.object({ subpath: z.string().optional() }).parse(request.params.arguments);
                        const target = checkPath(args.subpath || "");
                        const files = await fs.readdir(target, { withFileTypes: true });
                        return {
                            content: [{ type: "text", text: JSON.stringify(files.map(f => ({ name: f.name, isDir: f.isDirectory() })), null, 2) }]
                        };
                    }
                    case "read_file": {
                        const args = z.object({ subpath: z.string() }).parse(request.params.arguments);
                        const content = await fs.readFile(checkPath(args.subpath), 'utf-8');
                        return { content: [{ type: "text", text: content }] };
                    }
                    case "write_file": {
                        const args = z.object({ subpath: z.string(), content: z.string() }).parse(request.params.arguments);
                        await fs.writeFile(checkPath(args.subpath), args.content, 'utf-8');
                        return { content: [{ type: "text", text: "File written successfully" }] };
                    }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
                }
            } catch (err: unknown) {
                this.log(`Error: ${err}`, 'error');
                throw new McpError(ErrorCode.InternalError, String(err));
            }
        });
    }

    public async start() {
        if (this.state.isRunning) return;

        this.expressApp = express();
        this.expressApp.use(cors());
        // this.expressApp.use(express.json()); // Removed to allow SDK to read the stream

        // Auth Middleware
        this.expressApp.use((req, res, next) => {
            if (!this.state.config.apiKey) return next();
            const auth = req.headers.authorization?.replace("Bearer ", "") || req.query.key as string;
            if (auth !== this.state.config.apiKey) return res.status(401).json({ error: "Unauthorized" });
            next();
        });

        this.expressApp.get("/sse", async (req, res) => {
            const clientIp = req.socket.remoteAddress || req.ip;
            this.log(`New connection established from ${clientIp}`, 'info');
            const transport = new SSEServerTransport("/message", res);
            await this.server.connect(transport);

            // Store transport by sessionId usage? 
            // The SSEServerTransport has a `sessionId` property.
            this.transports.set(transport.sessionId, transport);

            // Cleanup on close
            res.on('close', () => {
                this.transports.delete(transport.sessionId);
            });
        });

        this.expressApp.post("/message", async (req, res) => {
            const sessionId = req.query.sessionId as string;
            const transport = this.transports.get(sessionId);
            if (!transport) return res.status(404).send("Session not found");

            await transport.handlePostMessage(req, res);
        });

        const host = this.state.config.isolation ? '127.0.0.1' : '0.0.0.0';
        this.httpServer = this.expressApp.listen(this.state.config.port, host, () => {
            this.state.isRunning = true;
            this.log(`Server started on http://${host}:${this.state.config.port}/sse`, 'info');
            this.mainWindow.webContents.send('status-update', this.state);
        });
    }

    public stop() {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }
        this.state.isRunning = false;
        this.log("Server stopped", 'info');
        this.mainWindow.webContents.send('status-update', this.state);
    }

    public updateConfig(newConfig: Partial<ServerConfig>) {
        this.state.config = { ...this.state.config, ...newConfig };
        // If running, might need restart to apply port/host change
        this.log("Configuration updated", 'info');
        this.mainWindow.webContents.send('status-update', this.state);
    }
}
