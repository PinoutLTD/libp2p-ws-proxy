import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import { pipe } from 'it-pipe'
import { createLibp2p } from 'libp2p'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

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
    })
}

const createNode = async () => {
    const node = await createLibp2p({
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/9999/ws']
        },
        transports: [
          webSockets()
        ],
        streamMuxers: [
          yamux(), mplex()
        ],
        connectionEncryption: [
          noise()
        ]
      })
    return node
}

export { getRequest, sendResponse, handle, createNode }