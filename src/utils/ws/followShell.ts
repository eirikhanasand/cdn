import { WebSocket } from 'ws'
import config from '#constants'
import removeClient from './removeClient.ts'
import registerClient from './registerClient.ts'
import updateVM from '../vm/getVMInternals.ts'

export const shellClients = new Map<string, Set<WebSocket>>()
const messageBuffer: Buffer[] = []

export default function followShell(connection: WebSocket, id: string, name: string, user: string) {
    try {
        const internalWs = new WebSocket(`${config.internal_wss}/${name}/shell/${user}/${id}`, {
            headers: {
                'User-Agent': 'hanasand_internal'
            }
        })

        updateVM(name)
        registerClient(id, connection, shellClients)

        internalWs.on('message', (msg) => {
            connection.send(msg)
        })

        internalWs.on('open', () => {
            messageBuffer.forEach((msg) => internalWs.send(msg))
            messageBuffer.length = 0
        })

        internalWs.on('close', () => {
            try {
                connection.close()
            } catch (error) { 
                console.log(`Error occured while closing connection for id ${id}: ${error}`)
            }
        })

        internalWs.on('error', (error) => {
              console.error(`internalWs connection failed for ${id}:`, error.message)
                if (connection.readyState === WebSocket.OPEN) {
                    try {
                        connection.send(JSON.stringify({ type: 'error', message: 'Internal shell connection failed', detail: error.message }))
                    } catch (error) {
                        console.error(`Send to client failed: ${error}`)
                    }
                }

                connection.close()
        })

        connection.on('message', (msg: Buffer) => {
            if (internalWs.readyState === WebSocket.OPEN) {
                try {
                    internalWs.send(msg)
                } catch (error) {
                    console.error(`Send to internal websocket failed: ${error}`)
                }
            } else {
                messageBuffer.push(msg)
            }
        })

        connection.on('close', () => {
            removeClient(id, connection, shellClients)
            internalWs.close()
        })

    } catch (error) {
        connection.send(Buffer.from(JSON.stringify(error)))
        console.log(error)
    }
}
