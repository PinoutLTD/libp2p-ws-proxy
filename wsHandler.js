import { WebSocketServer } from 'ws';

const createWebsocketServer = () => {
    const port = 8888
    const wss = new WebSocketServer({ port: port }, () => {
        console.log(`WebSocket server listening on port ${port}`);
    });
    return wss 
}

export { createWebsocketServer }