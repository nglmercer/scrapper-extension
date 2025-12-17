# Testing

The package includes comprehensive tests and a WebSocket test server.

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Start WebSocket test server
npm run test:server
```

## WebSocket Test Server

A built-in WebSocket test server is available for development and testing:

```javascript
import { WebSocketTestServer } from "raw-data-interceptor/tests";

const server = new WebSocketTestServer({
  port: 8080,
  host: "localhost",
  path: "/ws",
  enableHeartbeat: true,
  messageTypes: ["text", "json", "binary", "ping", "chat"],
});

await server.start();

// The server supports various message types and automatic responses
```
