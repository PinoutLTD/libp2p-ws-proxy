import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import { pipe } from 'it-pipe'
import { createLibp2p } from 'libp2p'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'

const getRequest = async (stream) => {
    return pipe(
        stream,
        async function (source) {
        let result = ''
        for await (const data of source) {
            result += uint8ArrayToString(data.subarray())
        }
        return JSON.parse(result)
        }
    )
}

const sendResponse = async (stream, msg) => {
    return pipe(
        [uint8ArrayFromString(JSON.stringify(msg))],
        stream.sink
    ).finally(() => {
        stream.close()
    })
}


const handle = (node, topic, fn) => {
    return node.handle(topic, async ({ stream }) => {
        fn(await getRequest(stream), stream)
    }, {runOnTransientConnection: true})
}

async function request(connection, topic, data) {
  
  if (connection.status !== "open") {
    return;
  }
  const stream = await connection.newStream([topic], {
    runOnTransientConnection: true
  });
  return pipe(
    [uint8ArrayFromString(JSON.stringify(data))],
    stream,
    async function (source) {
      let result = "";
      for await (const data of source) {
        result += uint8ArrayToString(data.subarray());
      }
      try {
        return JSON.parse(result);
      } catch (error) {
        console.log("request error:", error.message)
        return result
      }
    }
  );
}

async function sendState(connection, data) {
  try {
    console.log(
      connection.id.toString(),
      connection.remoteAddr.toString(),
      connection.status.toString()
    );
    const response = await request(connection, "/update", data);
    console.log("Response from send state", response);
  } catch (error) {
    console.log("sendState error:", error.message);
  }
}

const createNode = async () => {
    const node = await createLibp2p({
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/9999/ws']
        },
        transports: [
          webSockets(),
          circuitRelayTransport({
            discoverRelays: 1
          })
        ],
        streamMuxers: [
          mplex()
        ],
        connectionEncryption: [
          noise()
        ],
        services: {
          identify: identifyService()
        }

      })
    return node
}

export { getRequest, sendResponse, handle, createNode, sendState }