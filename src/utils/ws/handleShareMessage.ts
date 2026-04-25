import type { RawData } from 'ws'
import { WebSocket as WS } from 'ws'
import broadcastShareUpdate from './broadcastShareUpdate.ts'
import queueShareSave from './queueShareSave.ts'

export default async function handleShareMessage(
    id: string,
    socket: WS,
    rawMessage: RawData,
) {
    try {
        const msg = JSON.parse(rawMessage.toString())
        if (msg.type !== 'edit') {
            return
        }

        broadcastShareUpdate(id, socket, msg.content)
        queueShareSave(id, msg.content)
    } catch (error) {
        console.log(`Invalid WebSocket message: ${error}`)
    }
}
