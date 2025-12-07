#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

// Type definitions for file system objects
interface FileInfo {
    name: string;
    type: 'file' | 'directory' | 'other';
    size?: number;
    path: string;
}

class FileSystemServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            {
                name: "file-system-server",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();

        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    private setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "list_directory",
                    description: "List the contents of a directory",
                    inputSchema: {
                        type: "object",
                        properties: {
                            path: {
                                type: "string",
                                description: "The absolute path to the directory",
                            },
                        },
                        required: ["path"],
                    },
                },
                {
                    name: "read_file",
                    description: "Read the full content of a file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            path: {
                                type: "string",
                                description: "The absolute path to the file",
                            },
                        },
                        required: ["path"],
                    },
                },
                {
                    name: "write_file",
                    description: "Write content to a file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            path: {
                                type: "string",
                                description: "The absolute path to the file",
                            },
                            content: {
                                type: "string",
                                description: "The content to write",
                            },
                        },
                        required: ["path", "content"],
                    },
                },
                {
                    name: "search_files",
                    description: "Recursively search for files matching a pattern",
                    inputSchema: {
                        type: "object",
                        properties: {
                            directory: {
                                type: "string",
                                description: "The directory to search in",
                            },
                            pattern: {
                                type: "string",
                                description: "The search pattern (case-insensitive substring match by default)",
                            },
                        },
                        required: ["directory", "pattern"],
                    },
                },
            ],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case "list_directory": {
                    const params = z.object({ path: z.string() }).parse(request.params.arguments);
                    return await this.handleListDirectory(params.path);
                }
                case "read_file": {
                    const params = z.object({ path: z.string() }).parse(request.params.arguments);
                    return await this.handleReadFile(params.path);
                }
                case "write_file": {
                    const params = z.object({ path: z.string(), content: z.string() }).parse(request.params.arguments);
                    return await this.handleWriteFile(params.path, params.content);
                }
                case "search_files": {
                    const params = z.object({ directory: z.string(), pattern: z.string() }).parse(request.params.arguments);
                    return await this.handleSearchFiles(params.directory, params.pattern);
                }
                default:
                    throw new McpError(
                        ErrorCode.MethodNotFound,
                        `Unknown tool: ${request.params.name}`
                    );
            }
        });
    }

    private async handleListDirectory(dirPath: string) {
        try {
            // Basic security check: ensure it's an absolute path
            // In a real scenario, you'd want more robust path validation/sandboxing
            const absolutePath = path.resolve(dirPath);

            const entries = await fs.readdir(absolutePath, { withFileTypes: true });
            const files: FileInfo[] = entries.map((entry) => ({
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
                path: path.join(absolutePath, entry.name),
            }));

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(files, null, 2),
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    private async handleReadFile(filePath: string) {
        try {
            const absolutePath = path.resolve(filePath);
            const content = await fs.readFile(absolutePath, "utf-8");
            return {
                content: [
                    {
                        type: "text",
                        text: content,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    private async handleWriteFile(filePath: string, content: string) {
        try {
            const absolutePath = path.resolve(filePath);
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.writeFile(absolutePath, content, "utf-8");
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully wrote to ${absolutePath}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    private async handleSearchFiles(directory: string, pattern: string) {
        try {
            const absolutePath = path.resolve(directory);
            const results: string[] = [];

            async function walk(dir: string) {
                const list = await fs.readdir(dir);
                for (const file of list) {
                    const filePath = path.join(dir, file);
                    const stat = await fs.stat(filePath);
                    if (stat && stat.isDirectory()) {
                        await walk(filePath);
                    } else {
                        if (file.toLowerCase().includes(pattern.toLowerCase())) {
                            results.push(filePath);
                        }
                    }
                }
            }

            await walk(absolutePath);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results, null, 2),
                    }
                ]
            }

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error searching files: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    async run() {
        const port = process.env.PORT;
        const apiKey = process.env.MCP_API_KEY;

        if (port) {
            // SSE Mode
            const app = express();

            // Auth Middleware
            app.use((req, res, next) => {
                const authHeader = req.headers.authorization;
                // Allow passing key via header or query param
                const requestKey = authHeader?.replace("Bearer ", "") || req.query.key as string;

                if (apiKey && requestKey !== apiKey) {
                    return res.status(401).json({ error: "Unauthorized" });
                }
                next();
            });

            let transport: SSEServerTransport;

            app.get("/sse", async (req, res) => {
                transport = new SSEServerTransport("/message", res);
                await this.server.connect(transport);
            });

            app.post("/message", async (req, res) => {
                if (!transport) {
                    res.status(400).json({ error: "No active connection" });
                    return;
                }
                await transport.handlePostMessage(req, res);
            });

            app.listen(port, () => {
                console.error(`File System MCP server running on http://localhost:${port}/sse`);
                if (apiKey) console.error("Authentication enabled");
                else console.error("WARNING: No API key set, server is open to public!");
            });

        } else {
            // Stdio Mode
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            console.error("File System MCP server running on stdio");
        }
    }
}

const server = new FileSystemServer();
server.run().catch(console.error);
