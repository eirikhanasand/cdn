import { WebSocket as WS } from 'ws'

export const shareClients = new Map<string, Set<WS>>()
export const pendingUpdates = new Map<string, { content: string; timer: NodeJS.Timeout }>()

export type ShareClientPresence = {
    clientId: string
    userId: string
    displayName: string
    color: string
    cursorLine: number | null
    cursorColumn: number | null
    selectionLength: number
    editing: boolean
    updatedAt: string
}

export const sharePresence = new Map<WS, ShareClientPresence>()
