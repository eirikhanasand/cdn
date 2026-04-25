import { WebSocket } from 'ws'
import { shareClients } from './shareState.ts'
import broadcastJoin from './broadcastJoin.ts'

export default function registerClient(id: string, socket: WebSocket, clients?: Map<string, Set<WebSocket>>) {
    const targetClients = clients || shareClients
    if (!targetClients.has(id)) {
        targetClients.set(id, new Set())
    }

    targetClients.get(id)!.add(socket)
    broadcastJoin(id, targetClients)
}
