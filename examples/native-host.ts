import { type Readable } from "stream";

// 1. Setup Input Reading
const startHost = async () => {
    // Bun.stdin.stream() gives us a raw binary stream
    const reader = Bun.stdin.stream().getReader();
    let buffer = new Uint8Array(0);

    // Helper to append chunks to our buffer
    const appendBuffer = (chunk: Uint8Array) => {
        const newBuf = new Uint8Array(buffer.length + chunk.length);
        newBuf.set(buffer);
        newBuf.set(chunk, buffer.length);
        buffer = newBuf;
    };

    // 2. Main Loop
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        appendBuffer(value);

        // 3. Process buffer for complete messages
        while (true) {
            // Need at least 4 bytes for length prefix
            if (buffer.length < 4) break;

            const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const msgLen = view.getUint32(0, true); // Little Endian (Native)

            // Do we have the full message?
            if (buffer.length < 4 + msgLen) break;

            // Extract Message
            const msgBytes = buffer.slice(4, 4 + msgLen);
            const msgStr = new TextDecoder().decode(msgBytes);

            // Remove processed bytes from buffer
            buffer = buffer.slice(4 + msgLen);

            try {
                const json = JSON.parse(msgStr);
                handleMessage(json);
            } catch (err) {
                log(`Error parsing JSON: ${err}`);
            }
        }
    }
};

// 4. Handle & Re-emit Logic
function handleMessage(msg: any) {
    log(`Received: ${JSON.stringify(msg)}`);

    // --- RE-EMIT / ECHO ---
    // Make simpler output or modify data
    const response = {
        type: "echo",
        original: msg,
        timestamp: Date.now(),
        extra: "Processed by Bun Native Host"
    };

    sendMessage(response);
}

// 5. Send Message (Length-Prefixed)
function sendMessage(msg: any) {
    const jsonStr = JSON.stringify(msg);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    
    // Create Header (4 bytes length)
    const header = new ArrayBuffer(4);
    new DataView(header).setUint32(0, jsonBytes.length, true);

    // Flush directly to stdout
    Bun.stdout.write(new Uint8Array(header));
    Bun.stdout.write(jsonBytes);
}

// Simple file logger (since stdout is used for communication)
function log(text: string) {
    Bun.write("native-host.log", `[${new Date().toISOString()}] ${text}\n`);
}

// Start
startHost().catch(err => log(`Fatal: ${err}`));