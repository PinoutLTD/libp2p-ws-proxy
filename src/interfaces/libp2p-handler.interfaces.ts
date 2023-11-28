export interface ISendResponseMsg {
    result: boolean
}

/**
 * @TODO 

interface ISendStateMsgData {
    email: string,
    address: string
}
 */

export interface ISendStateMsg {
    protocol: string,
    serverPeerId: string,
    data: Object
}