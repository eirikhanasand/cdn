import { expect, test } from '@playwright/test'
import WebSocket from 'ws'

test('share websocket edits persist and can be loaded by another client', async ({ baseURL }) => {
    const apiBase = baseURL || 'http://127.0.0.1:8501/api'
    const shareId = `pw-${Date.now().toString(36)}`
    const content = `frfr-${Date.now().toString(36)}`

    const created = await fetch(`${apiBase}/share`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            id: shareId,
            content: '',
            name: shareId,
            path: shareId,
            type: 'file',
        }),
    })

    expect(created.ok).toBeTruthy()

    await sendWebSocketEdit(`${toWsApiBase(apiBase)}/ws/share/${shareId}`, content)

    await expect
        .poll(async () => {
            const response = await fetch(`${apiBase}/share/${shareId}`)
            const share = await response.json()
            return share.content
        }, {
            timeout: 5000,
        })
        .toBe(content)
})

test('new share websocket clients receive pending edits before debounce save finishes', async ({ baseURL }) => {
    const apiBase = baseURL || 'http://127.0.0.1:8501/api'
    const shareId = `pw-pending-${Date.now().toString(36)}`
    const content = `instant-${Date.now().toString(36)}`

    const created = await fetch(`${apiBase}/share`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            id: shareId,
            content: '',
            name: shareId,
            path: shareId,
            type: 'file',
        }),
    })

    expect(created.ok).toBeTruthy()

    const wsUrl = `${toWsApiBase(apiBase)}/ws/share/${shareId}`
    const editor = await openSocket(wsUrl)
    try {
        editor.send(JSON.stringify({ type: 'edit', content }))

        await expect.poll(
            () => readPendingUpdate(wsUrl),
            { timeout: 1000 },
        ).toBe(content)
    } finally {
        editor.close()
    }
})

function openSocket(url: string) {
    return new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(url)
        const timeout = setTimeout(() => {
            ws.close()
            reject(new Error(`Timed out opening websocket ${url}`))
        }, 5000)

        ws.on('open', () => {
            clearTimeout(timeout)
            resolve(ws)
        })

        ws.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
        })
    })
}

function readPendingUpdate(url: string) {
    return new Promise<string>((resolve, reject) => {
        const ws = new WebSocket(url)
        const timeout = setTimeout(() => {
            ws.close()
            reject(new Error(`Timed out waiting for pending update against ${url}`))
        }, 1000)

        ws.on('message', (raw) => {
            const message = JSON.parse(raw.toString()) as { type?: string, content?: string }
            if (message.type === 'update') {
                clearTimeout(timeout)
                ws.close()
                resolve(message.content || '')
            }
        })

        ws.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
        })
    })
}

function sendWebSocketEdit(url: string, content: string) {
    return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(url)
        const timeout = setTimeout(() => {
            ws.close()
            reject(new Error(`Timed out waiting for websocket edit against ${url}`))
        }, 5000)

        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'edit', content }))
            setTimeout(() => {
                clearTimeout(timeout)
                ws.close()
                resolve()
            }, 1200)
        })

        ws.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
        })
    })
}

function toWsApiBase(apiBase: string) {
    if (apiBase.startsWith('https://')) {
        return `wss://${apiBase.slice('https://'.length)}`
    }

    if (apiBase.startsWith('http://')) {
        return `ws://${apiBase.slice('http://'.length)}`
    }

    return apiBase
}
