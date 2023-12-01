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
import { multiaddr } from '@multiformats/multiaddr'
import { createFromJSON } from '@libp2p/peer-id-factory'

import dotenv from 'dotenv';

dotenv.config();


export class Libp2pManager {

  constructor() {
    this.configuration = new ConfigurationManager()
    this.realayAddress = process.env.RELAY_ADDRESS
  }

  connect2NodeViaRelay(node, peerId) {
    const address = `${this.realayAddress}/p2p-circuit/p2p/${peerId}`
    return node.dial(multiaddr(address))
    .then(connection => connection)
    .catch(error => {
      console.error("Error in connect2NodeViaRelay", error);
    });
  }

  checkConnectionByPeerId(node, peerId) {
    for (const connection of node.getConnections()) {
      if (peerId == connection.remotePeer.toString()) {
        console.log(`PeerId ${peerId} connected.}`)
        return connection
      }
    }  
    return false                    
  }


  async createNode() {
    const peerId = await this.configuration.loadOrGeneratePeerId()
    console.log(`peer id: ${peerId}`)
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

  async #getRequest(stream) {
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

  async sendResponse(stream, msg) {
      return pipe(
          [uint8ArrayFromString(JSON.stringify(msg))],
          stream.sink
      ).finally(() => {
          stream.close()
      })
  }


  handle(node, topic, fn) {
      return node.handle(topic, async ({ stream }) => {
          fn(await this.#getRequest(stream), stream)
      }, {runOnTransientConnection: true})
  }

  async #request(connection, topic, data) {
    
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

  async sendMsg(connection, data, topic) {
    try {
      console.log(
        connection.id.toString(),
        connection.remoteAddr.toString(),
        connection.status.toString()
      );
      const response = await this.#request(connection, topic, data);
      console.log("Response from send Msg", response);
    } catch (error) {
      console.log("sendMsg error:", error.message);
    }
  }

}

class ConfigurationManager {

  constructor() {
    this.filePath = process.env.PEER_ID_CONFIG_PATH
  }

  async #generateJSONPeerId() {
    console.log("Generating json config...")
      try {
          const peerId = await PeerId.create();
          const jsonContent = peerId.toJSON();
          await fs.writeFile(this.filePath, JSON.stringify(jsonContent, null, 2));
          console.log('Generated Private Key and stored in:', this.filePath);
      } catch (error) {
          console.error('Error generating and storing private key:', error);
      }
  }
  
  async loadOrGeneratePeerId() {
    try {
      await fs.access(this.filePath);
    } catch (error) {
      console.log(error.code)
      if (error.code === 'ENOENT') {
        console.log("No peerIdJson.json file. Creating a new one...")
        await this.#generateJSONPeerId();
      }
    }
      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      const jsonContent = JSON.parse(fileContent);
      return await createFromJSON(jsonContent);
  }
}

