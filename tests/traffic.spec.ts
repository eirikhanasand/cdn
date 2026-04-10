import { expect, test } from '@playwright/test'

type DomainTPS = {
    name: string
    tps: number
}

const cdnBase = process.env.CDN_BASE || process.env.PLAYWRIGHT_CDN_BASE || 'http://127.0.0.1:8501/api'

test('traffic speedometer receives fresh traffic', async ({ request }) => {
    const runId = `cdn_playwright_${Date.now()}`
    const domain = `${runId}.example`

    const logResponse = await request.post(`${cdnBase}/traffic`, {
        data: {
            domain,
            ip: '198.51.100.77',
            user_agent: 'Playwright CDN Traffic',
            path: '/playwright',
            method: 'GET',
        },
        headers: {
            'User-Agent': 'Hanasand Traffic Logger playwright',
        },
    })

    expect(logResponse.ok()).toBeTruthy()

    let payload: DomainTPS[] = []

    await expect.poll(async () => {
        const tpsResponse = await request.get(`${cdnBase}/traffic/tps?fresh=1`)
        expect(tpsResponse.ok()).toBeTruthy()
        payload = await tpsResponse.json()
        return payload.some((entry) => entry.name === domain && Number(entry.tps) > 0)
    }, {
        timeout: 12000,
        intervals: [500, 1000, 1500],
    }).toBeTruthy()

    expect(payload.some((entry) => entry.name === domain)).toBeTruthy()
})
