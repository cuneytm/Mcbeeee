#!/usr/bin/env node

/**
 * MCP Bridge (Stdio <-> SSE)
 * 
 * This script allows Claude Desktop (which only speaks Stdio) to connect
 * to the FileAgent Electron App (which speaks SSE).
 */

// import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/*
async function main() {
    // ...
}
*/

/**
 * SIMPLER APPROACH: Manual Bridge
 * We don't need the full SDK for this bridge if we just pipe JSON-RPC.
 */
import http from 'http';
import readline from 'readline';

async function runBridge() {
    const SSE_URL = 'http://localhost:3000/sse';
    const POST_URL = 'http://localhost:3000/message';
    // Use env var or default to empty
    const API_KEY = process.env.MCP_API_KEY || '';

    let sessionId = null;

    const fs = await import('fs');
    const log = (msg) => {
        fs.appendFileSync('/tmp/fileagent_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
    };

    log('Bridge started');

    // 1. Connect to SSE to get Session ID and Events
    const req = http.request(SSE_URL, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'text/event-stream'
        }
    }, (res) => {
        log(`SSE Request status: ${res.statusCode}`);
        res.on('data', (chunk) => {
            const text = chunk.toString();
            // Check for Session ID
            const match = text.match(/sessionId=([a-z0-9-]+)/);
            if (match) {
                sessionId = match[1];
                log(`Connected with Session ID: ${sessionId}`);
            }

            // Forward JSON-RPC events from Server -> Claude (Stdio)
            // SSE sends events like:
            // event: message
            // data: {...json...}

            const lines = text.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data.trim() === '[DONE]') return;
                    try {
                        // Just verify it's valid JSON before forwarding
                        JSON.parse(data);
                        // Forward to stdout
                        process.stdout.write(data + '\n');
                    } catch (e) {
                        // ignore non-json data (like urls)
                    }
                }
            }
        });
    });

    req.on('error', (e) => {
        console.error(`[Bridge Error] ${e.message}`);
        process.exit(1);
    });

    req.end();

    // 2. Listen to Stdio (Claude) and forward to Server (HTTP POST)
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    const pendingLines = [];

    rl.on('line', (line) => {
        if (!sessionId) {
            // Buffer the line until we have a session
            pendingLines.push(line);
            return;
        }

        sendToMcp(line, sessionId);
    });

    // Helper to send to MCP
    function sendToMcp(jsonLine, sid) {
        const postReq = http.request(`${POST_URL}?sessionId=${sid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            }
        }, (res) => {
            // Response handled by SSE
        });

        postReq.on('error', (e) => {
            log(`Bridge POST Error: ${e.message}`);
        });

        postReq.write(jsonLine);
        postReq.end();
    }

    // Check for session loop (hacky but simple) to replay buffer
    const checkInterval = setInterval(() => {
        if (sessionId && pendingLines.length > 0) {
            while (pendingLines.length > 0) {
                const line = pendingLines.shift();
                sendToMcp(line, sessionId);
            }
            clearInterval(checkInterval);
        }
    }, 100);
}

runBridge();
