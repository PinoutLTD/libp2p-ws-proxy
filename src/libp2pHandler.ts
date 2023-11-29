import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import { pipe } from 'it-pipe'
import { createLibp2p } from 'libp2p'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import fs from 'fs/promises';
import PeerId from 'peer-id';
import { createFromJSON } from '@libp2p/peer-id-factory'
import { ISendResponseMsg, ISendStateMsg } from './interfaces'
// import { Connection } from '@libp2p/interface/dist/src/connection'


async function generateJSONPeerId(filePath: string) {
  console.log("generating json...")
  try {
    const peerId = await PeerId.create();
    const jsonContent = peerId.toJSON();
    await fs.writeFile(filePath, JSON.stringify(jsonContent, null, 2));

    console.log('Generated Private Key and stored in:', filePath);
  } catch (error) {
    console.error('Error generating and storing private key:', error);
  }
}

async function loadOrGeneratePeerId(filePath: string) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log("No peerIdJson.json file. Creating a new one...")
      await generateJSONPeerId(filePath);
    }
  }
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const jsonContent = JSON.parse(fileContent);
  return await createFromJSON(jsonContent);
}


const getRequest = async (stream: any) => {
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

const sendResponse = async (stream: any, msg: ISendResponseMsg) => {
  return pipe(
    [uint8ArrayFromString(JSON.stringify(msg))],
    stream.sink
  ).finally(() => {
    stream.close()
  })
}


const handle = (node: any, topic: string, fn: any) => {
  //@ts-ignore
  return node.handle(topic, async ({ stream }) => {
    fn(await getRequest(stream), stream)
  }, { runOnTransientConnection: true })
}


async function request(connection: any /* Connection*/, topic: string, data: ISendStateMsg) {

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
        console.log("request error:", (error as NodeJS.ErrnoException).message)
        return result
      }
    }
  );
}

async function sendState(connection: any /* Connection*/, data: ISendStateMsg) {
  try {
    console.log(
      connection.id.toString(),
      connection.remoteAddr.toString(),
      connection.status.toString()
    );
    const response = await request(connection, "/update", data);
    console.log("Response from send state", response);
  } catch (error) {
    console.log("sendState error:", (error as NodeJS.ErrnoException).message);
  }
}

const createNode = async () => {
  const filePath = "peerIdJson.json"
  const peerId = await loadOrGeneratePeerId(filePath)
  const node = await createLibp2p({
    peerId: peerId,
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