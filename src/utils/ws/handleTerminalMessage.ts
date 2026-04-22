import type { RawData } from 'ws'

export default async function handleTerminalMessage(
    _: string,
    __: import('ws').WebSocket,
    rawMessage: RawData,
) {
    try {
        const msg = JSON.parse(rawMessage.toString())
        if (msg.type !== 'terminalMessage' && msg.type !== 'terminalInput' && msg.type !== 'resize') {
            return
        }
    } catch (error) {
        console.error(`Invalid WebSocket message: ${error}`)
    }
}
