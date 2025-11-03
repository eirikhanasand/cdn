import { WebSocket } from 'ws'
import config from '#constants'
import removeClient from './removeClient.ts'
import registerClient from './registerClient.ts'

export const shellClients = new Map<string, Set<WebSocket>>()
const messageBuffer: Buffer[] = []

export default function followShell(id: string, name: string, connection: WebSocket) {
    try {
        const internalWs = new WebSocket(`${config.internal_wss}/api/ws/${name}/shell/${id}`, {
            headers: {
                'User-Agent': 'hanasand_internal'
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
    } catch (error) {
        connection.send(Buffer.from(JSON.stringify(error)))
        console.log(error)
    }
}
