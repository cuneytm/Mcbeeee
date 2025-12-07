# File System MCP Server

A Model Context Protocol (MCP) server that provides safe file system access tools for LLMs.

## Features

- **Tools**: List, Read, Write, Search files.
- **Transports**: 
  - Standard Input/Output (Stdio) - for local integration.
  - Server-Sent Events (SSE) - for remote/container integration.
- **Authentication**: API Key support for SSE.

## Local Installation

```bash
npm install
npm run build
```

### Usage with Stdio

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": [
        "/absolute/path/to/fileagent-mcp/build/index.js"
      ]
    }
  }
}
```

## Docker Usage

1. **Build the image**:
   ```bash
   docker build -t fileagent-mcp .
   ```

2. **Run the container**:
   ```bash
   # Mount a host directory to /data in the container
   docker run -d \
     -p 3000:3000 \
     -e MCP_API_KEY=my-secret-key \
     -v /path/to/host/dir:/app/data \
     fileagent-mcp
   ```

   *Note: The server will be accessible at `http://localhost:3000/sse`*

## Authentication

When using the SSE transport (running with `PORT` env var), you should set `MCP_API_KEY`.
Clients must provide the key via:
- **Header**: `Authorization: Bearer <key>`
- **Query Parameter**: `?key=<key>`
