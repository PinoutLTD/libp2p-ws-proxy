# Libp2p <-> Websocket Proxy

Module for message proxying between libp2p channels and WebSocket clients, and vice versa. Currently Libp2p nodes supports web socket transport via relay chain.

## RRunning

### Docker

---

Requirements:
1. Docker

Installation:

```
git clone https://github.com/tubleronchik/libp2p-ws-proxy.git
cd libp2p-ws-proxy
cp .env.template .env
```
Set the configuration file by specifying the relay address and the directory name for data storage.

Build:

Specify the port number on which the WebSocket server will be launched. The `PORT` variable specifying the port number in the Docker container. It can be any variable except `9999`.

```
docker build --build-arg PORT=<port> -t proxy:v0.0.1 .
```

Launch:

To enable access to the WebSocket server from another application, it is essential to establish a port mapping between the host and the container. While not mandatory, it is advisable to align the port numbers in the container and on the host.  So use the same port number as you did during build:

```
docker run -p 127.0.0.1:<port>:<port> -p 127.0.0.1:9999:9999 proxy:v0.0.1
```

### From Source
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

Specify the port number on which the WebSocket server will be launched.
```
export PORT=<port>
node src/index.js
```
Then you can connect a websocket client and libp2p nodes to proxy messages between them.