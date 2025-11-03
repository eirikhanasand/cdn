import { WebSocket } from 'ws'
import config from '#constants'
import removeClient from './removeClient'
import registerClient from './registerClient'

export const shellClients = new Map<string, Set<WebSocket>>()
const messageBuffer: Buffer[] = []

export default function followTerminal(id: string, connection: WebSocket) {
    const internalWs = new WebSocket(`${config.internal_wss}${id}`, {
        headers: {
            'User-Agent': 'MyCustomUserAgent/1.0'
        }
    })

    registerClient(id, connection, shellClients)

    internalWs.on('message', (msg) => {
        connection.send(msg)
    })

    internalWs.on('open', () => {
        messageBuffer.forEach((msg) => internalWs.send(msg))
        messageBuffer.length = 0
    })

    connection.on('message', (msg: Buffer) => {
        if (internalWs.readyState === WebSocket.OPEN) {
            internalWs.send(msg)
        } else {
            messageBuffer.push(msg)
        }
    })

    connection.on('close', () => {
        removeClient(id, connection, shellClients)
        internalWs.close()
    })

    internalWs.on('close', () => {
        try {
            connection.close()
        } catch (error) { 
            console.log(`Error occured while closing connection for id ${id}: ${error}`)
        }
    })
}
