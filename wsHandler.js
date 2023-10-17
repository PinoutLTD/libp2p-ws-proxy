import { WebSocketServer } from 'ws';

const createWebsocketServer = () => {
    const wss = new WebSocketServer({ port: 8080 }, () => {
        console.log('WebSocket server listening on port 8080');
    });
    return wss 
}

export { createWebsocketServer }