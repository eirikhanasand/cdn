import { WebSocket as WS } from 'ws'

export const shareClients = new Map<string, Set<WS>>()
export const pendingUpdates = new Map<string, { content: string; timer: NodeJS.Timeout }>()
