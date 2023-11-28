import { WebSocketServer } from 'ws';

function createWebsocketServer(): WebSocketServer {
    const port: number = 8888
    const wss = new WebSocketServer({ port: port }, () => {
        console.log(`WebSocket server listening on port ${port}`);
    });
    return wss
}

export { createWebsocketServer }