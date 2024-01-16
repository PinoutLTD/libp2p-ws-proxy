# Libp2p <-> Websocket Proxy

Module for message proxying between libp2p channels and WebSocket clients, and vice versa. Currently Libp2p nodes supports web socket transport via relay chain.

---

Requirements:
1. Node v.18.16.1

Installation:

```
git clone https://github.com/tubleronchik/libp2p-ws-proxy.git
cd libp2p-ws-proxy
npm install
cp .env.template .env
```
Set the configuration file by specifying the relay address and the directory name for data storage.

Launch:
```
node src/index.js
```
Then you can connect a websocket client and libp2p nodes to proxy messages between them.