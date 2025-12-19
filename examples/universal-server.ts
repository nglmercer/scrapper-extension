import { serve } from "bun";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WebSocketData {
  type: 'stream';
}

export type LogSource = 'webhook' | 'socket-stream';

export interface LogEntry {
  id: string;
  source: LogSource;
  timestamp: string;
  // HTTP specific
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  contentType?: string;
  // Content
  body: any;
}

// -----------------------------------------------------------------------------
// UTILS
// -----------------------------------------------------------------------------

class Utils {
  static formatBytes(bytes: number, decimals = 2): string {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  static async parseBody(req: Request): Promise<{ body: any; contentType: string }> {
    const contentType = req.headers.get("content-type") || "application/octet-stream";
    let body: any;

    try {
      if (contentType.includes("application/json")) {
        body = await req.json();
      } else if (contentType.includes("text/") || contentType.includes("application/x-www-form-urlencoded")) {
        body = await req.text();
      } else {
        const arrayBuffer = await req.arrayBuffer();
        body = {
          _type: "binary",
          size: Utils.formatBytes(arrayBuffer.byteLength),
          hex: Buffer.from(arrayBuffer).subarray(0, 100).toString("hex") + (arrayBuffer.byteLength > 100 ? "..." : ""),
        };
      }
    } catch (e: any) {
      body = { error: "Failed to parse body", message: e.message };
    }
    return { body, contentType };
  }
}

// -----------------------------------------------------------------------------
// LOG MANAGER
// -----------------------------------------------------------------------------

class LogManager {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  add(entry: LogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
    this.printToConsole(entry);
  }

  private printToConsole(entry: LogEntry) {
    const meta = entry.method ? ` | ${entry.method} ${entry.url}` : '';
    console.log(`\n[${entry.timestamp}] [${entry.source.toUpperCase()}]${meta}`);
    
    let preview: string;
    try {
       const str = JSON.stringify(entry.body);
       preview = str.length > 200 ? str.substring(0, 200) + '...' : str;
    } catch {
       preview = String(entry.body);
    }
    console.log(`Payload: ${preview}`);
  }
}

// -----------------------------------------------------------------------------
// SERVER
// -----------------------------------------------------------------------------

const logManager = new LogManager();

const server = serve<WebSocketData>({
  port: parseInt(Bun.env.PORT || "3000"),
  
  async fetch(req, server) {
    const url = new URL(req.url);

    // 1. Stream WebSocket
    if (url.pathname === "/stream") {
      const success = server.upgrade(req, { data: { type: 'stream' } });
      return success ? undefined : new Response("WebSocket upgrade failed", { status: 400 });
    }

    // 2. Webhook Endpoint
    if (url.pathname === "/webhook" && req.method === "POST") {
      const timestamp = new Date().toISOString();
      const id = crypto.randomUUID();
      
      const { body, contentType } = await Utils.parseBody(req);
      
      logManager.add({
        id,
        source: 'webhook',
        timestamp,
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        contentType,
        body
      });

      return new Response(JSON.stringify({ status: "ok", id }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
        console.log('[System] Stream connected');
    },
    message(ws, message) {
        try {
            const parsed = typeof message === 'string' ? JSON.parse(message) : message;
            logManager.add({
                id: crypto.randomUUID(),
                source: 'socket-stream',
                timestamp: new Date().toISOString(),
                body: parsed
            });
        } catch (e) {
            console.error('Failed to parse stream message');
        }
    },
    close(ws) {
        console.log('[System] Stream disconnected');
    },
  },
});

console.log(`\n==================================================`);
console.log(` 🚀 RAW Interceptor Universal Server`);
console.log(`--------------------------------------------------`);
console.log(` • Webhook:    http://localhost:${server.port}/webhook`);
console.log(` • Stream:     ws://localhost:${server.port}/stream`);
console.log(`==================================================\n`);
