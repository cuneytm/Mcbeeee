
import { useState, useEffect } from 'react';
import { Power, FolderOpen, Globe, Lock, Terminal, CheckCircle2, XCircle, AlertCircle, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { ServerState, ApprovalRequest } from './types';
import logoImage from './assets/logo.png';

// Utility for class merging
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Components
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("bg-surface border border-white/5 rounded-xl p-6", className)}>
        {children}
    </div>
);

const Button = ({ children, variant = 'primary', onClick, className, disabled }: any) => {
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white",
        danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
        secondary: "bg-white/5 hover:bg-white/10 text-gray-300",
        success: "bg-green-500 hover:bg-green-400 text-white"
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn("px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2", variants[variant as keyof typeof variants], className)}
        >
            {children}
        </button>
    );
};

export default function App() {
    const [state, setState] = useState<ServerState>({
        isRunning: false,
        config: { isolation: true, apiKey: '', allowedPath: '', port: 3000, approveRequests: true },
        logs: []
    });
    const [pendingRequest, setPendingRequest] = useState<ApprovalRequest | null>(null);

    useEffect(() => {
        // Initial fetch handled by main process sending 'status-update' on load

        // Listeners
        const removeStatus = window.ipcRenderer.on('status-update', (_: any, newState: ServerState) => {
            setState(newState);
        });

        const removeLog = window.ipcRenderer.on('log-update', (_: any, entry: string) => {
            setState(prev => ({ ...prev, logs: [...prev.logs, entry].slice(-100) }));
        });

        const removeApproval = window.ipcRenderer.on('request-approval', (_: any, req: ApprovalRequest) => {
            console.log('Received approval request:', req);
            setPendingRequest(req);
        });

        const removeCloseApproval = window.ipcRenderer.on('close-approval', (_: any, id: string) => {
            console.log('Closing approval modal for:', id);
            // Close modal if it matches the resolved request
            setPendingRequest(prev => {
                if (prev?.id === id) {
                    console.log('Modal closed');
                    return null;
                }
                return prev;
            });
        });

        return () => {
            removeStatus();
            removeLog();
            removeApproval();
            removeCloseApproval();
        };
    }, []);

    const handleStartStop = () => {
        if (state.isRunning) window.ipcRenderer.stopServer();
        else window.ipcRenderer.startServer();
    };

    const handlePickDir = async () => {
        const path = await window.ipcRenderer.pickDirectory();
        if (path) {
            window.ipcRenderer.updateConfig({ allowedPath: path });
        }
    };

    const handleIsolationToggle = () => {
        window.ipcRenderer.updateConfig({ isolation: !state.config.isolation });
    };

    const handleApprovalToggle = () => {
        window.ipcRenderer.updateConfig({ approveRequests: !state.config.approveRequests });
    };

    const handleResolve = (approved: boolean) => {
        if (pendingRequest) {
            window.ipcRenderer.resolveApproval(pendingRequest.id, approved);
            setPendingRequest(null);
        }
    };

    return (
        <div className="min-h-screen bg-background text-gray-200 p-8 font-sans selection:bg-amber-500/30">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    {/* Logo */}
                    <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-amber-500/10 overflow-hidden shrink-0">
                        <img src={logoImage} alt="MCBeeee Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight leading-none">MCBeeee</h1>
                        <p className="text-amber-500/80 text-sm font-medium mt-1">Secure Agentic Gateway</p>
                    </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-mono border", state.isRunning ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-800 text-gray-500 border-gray-700")}>
                    {state.isRunning ? `ONLINE :${state.config.port}` : "OFFLINE"}
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Controls */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Server Control */}
                    <Card className="flex items-center justify-between border-amber-500/10">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Server Status</h3>
                            <p className="text-gray-400 text-sm">Control the visibility of your agent.</p>
                        </div>
                        <Button
                            variant={state.isRunning ? "danger" : "success"}
                            onClick={handleStartStop}
                            className="w-32 justify-center"
                        >
                            <Power className="w-4 h-4" />
                            {state.isRunning ? "Stop" : "Start"}
                        </Button>
                    </Card>

                    {/* Configuration */}
                    <Card className="space-y-6 border-amber-500/10">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-500" /> Security Configuration
                        </h3>

                        {/* Isolation Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-md", state.config.isolation ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400")}>
                                    {state.config.isolation ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="font-medium text-white">Network Isolation</div>
                                    <div className="text-xs text-gray-400">
                                        {state.config.isolation ? "Only Allow Localhost (127.0.0.1)" : "Allow External Network (0.0.0.0)"}
                                    </div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={state.config.isolation} onChange={handleIsolationToggle} />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                            </label>
                        </div>

                        {/* Warning when isolation is disabled */}
                        {!state.config.isolation && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-orange-300">
                                    <div className="font-semibold mb-1">Security Warning</div>
                                    <div className="text-orange-400/80">
                                        Your server is accessible from external networks. Make sure your firewall allows port {state.config.port} if you want external access, or re-enable Network Isolation for localhost-only access.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Request Approval Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-md", state.config.approveRequests ? "bg-amber-500/20 text-amber-400" : "bg-gray-500/20 text-gray-400")}>
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium text-white">Request Approval</div>
                                    <div className="text-xs text-gray-400">
                                        {state.config.approveRequests ? "Require approval for all tool calls" : "Auto-approve all requests"}
                                    </div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={state.config.approveRequests} onChange={handleApprovalToggle} />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                            </label>
                        </div>

                        {/* Notification info when approval is enabled */}
                        {state.config.approveRequests && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
                                <Bell className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-blue-300">
                                    <div className="font-semibold mb-1">Notification Permissions</div>
                                    <div className="text-blue-400/80">
                                        macOS will ask for notification permissions when the first approval request arrives. Enable them in System Settings → Notifications → MCBeeee to see approval requests even when the app is in the background.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Allowed Path */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Allowed Directory</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 p-2 bg-black/40 border border-white/10 rounded-lg text-sm font-mono truncate text-gray-300">
                                        {state.config.allowedPath || <span className="text-gray-600 italic">No directory selected</span>}
                                    </div>
                                    <Button variant="secondary" onClick={handlePickDir}>
                                        <FolderOpen className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            {/* API Key */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">API Key</label>
                                <input
                                    type="text"
                                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm font-mono text-gray-300 focus:outline-none focus:border-amber-500/50 transition-colors"
                                    value={state.config.apiKey}
                                    onChange={(e) => window.ipcRenderer.updateConfig({ apiKey: e.target.value })}
                                    placeholder="Optional key..."
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Col: Logs & Connection */}
                <div className="lg:col-span-1 h-full flex flex-col gap-6">

                    {/* Connection Guide */}
                    <Card className="flex flex-col gap-4 border-amber-500/10">
                        <div className="flex items-center gap-2 text-white border-b border-white/5 pb-2">
                            <Terminal className="w-4 h-4 text-amber-500" />
                            <span className="font-semibold text-sm">Connection Config</span>
                        </div>
                        <p className="text-xs text-gray-400">
                            Click to copy configuration for your MCP client
                        </p>

                        <div className="space-y-3">
                            {/* VS Code Config */}
                            <div className="bg-black/40 border border-white/10 rounded-lg p-4 group hover:border-blue-500/30 transition-all cursor-pointer"
                                onClick={() => {
                                    const config = {
                                        "mcpServers": {
                                            "mcbeeee": {
                                                "url": `http://localhost:${state.config.port}/sse`,
                                                "apiKey": state.config.apiKey
                                            }
                                        }
                                    };
                                    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                                }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">VS</div>
                                    <div className="text-base font-semibold text-gray-200">VS Code</div>
                                </div>
                                <div className="text-xs text-gray-400 mb-2">Click to copy config</div>
                                <div className="bg-black/60 rounded p-2 border border-white/5">
                                    <div className="text-[10px] text-gray-500 mb-1">Config file location:</div>
                                    <div className="text-xs text-amber-400 font-mono break-all">
                                        ~/.vscode/mcp.json
                                    </div>
                                </div>
                            </div>

                            {/* Claude Desktop Config */}
                            <div className="bg-black/40 border border-white/10 rounded-lg p-4 group hover:border-amber-600/30 transition-all cursor-pointer"
                                onClick={() => {
                                    const bridgePath = "/Users/cmo/Documents/PROJELER/FILEAGENT_MCP/bridge.js";
                                    const config = {
                                        "mcpServers": {
                                            "mcbeeee": {
                                                "command": "node",
                                                "args": [bridgePath],
                                                "env": {
                                                    "MCP_API_KEY": state.config.apiKey
                                                }
                                            }
                                        }
                                    };
                                    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                                }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold text-xs">Ai</div>
                                    <div className="text-base font-semibold text-gray-200">Claude Desktop</div>
                                </div>
                                <div className="text-xs text-gray-400 mb-2">Click to copy config</div>
                                <div className="bg-black/60 rounded p-2 border border-white/5">
                                    <div className="text-[10px] text-gray-500 mb-1">Config file location:</div>
                                    <div className="text-xs text-amber-400 font-mono break-all leading-relaxed">
                                        ~/Library/Application Support/Claude/claude_desktop_config.json
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                            <h4 className="text-xs font-semibold text-gray-300 mb-1">Bridge Mode</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                Using <code>node bridge.js</code> allows standard IO clients (like Claude) to talk to this SSE server.
                            </p>
                        </div>
                    </Card>

                    {/* Activity Log - Fixed Height */}
                    <Card className="flex flex-col p-0 overflow-hidden bg-black/20 border-amber-500/10 h-[300px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-sm">Activity Log</span>
                            </div>
                            {state.logs.length > 0 && (
                                <button
                                    onClick={() => {
                                        setState(prev => ({ ...prev, logs: [] }));
                                    }}
                                    className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
                                    title="Clear history"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            {state.logs.length === 0 && <div className="text-gray-600 text-center mt-10">No activity yet</div>}
                            {state.logs.map((log, i) => (
                                <div key={i} className="text-gray-400 border-b border-white/5 pb-1 last:border-0 last:pb-0 break-all">
                                    <span className={cn("mr-2", log.includes("[ERROR]") ? "text-red-400" : log.includes("[REQUEST]") ? "text-amber-400" : "text-gray-500")}>
                                        {log.includes(']') ? log.split(']')[1] + ']' : ''}
                                    </span>
                                    {log.includes(']') ? log.split(']').slice(2).join(']') : log}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </main>

            {/* Approval Modal */}
            <AnimatePresence>
                {pendingRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-amber-500/10"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                                    <AlertCircle className="w-6 h-6 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Approval Required</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    An external agent works like to execute a command.
                                </p>

                                <div className="w-full bg-black/40 rounded-lg p-4 mb-6 text-left border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Command</div>
                                    <div className="font-mono text-green-400 mb-2">{pendingRequest.toolName}</div>
                                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Arguments</div>
                                    <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {JSON.stringify(pendingRequest.args, null, 2)}
                                    </pre>
                                </div>

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <Button variant="danger" className="text-center justify-center" onClick={() => handleResolve(false)}>
                                        <XCircle className="w-4 h-4" /> Deny
                                    </Button>
                                    <Button variant="success" className="text-center justify-center" onClick={() => handleResolve(true)}>
                                        <CheckCircle2 className="w-4 h-4" /> Approve
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
