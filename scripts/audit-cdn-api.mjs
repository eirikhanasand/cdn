import pg from 'pg'
import crypto from 'crypto'

const cdnBase = process.env.CDN_BASE || 'http://127.0.0.1:8501/api'
const apiBase = process.env.API_BASE || 'http://127.0.0.1:8080/api'
const runId = `cdn_audit_${Date.now()}`
const password = process.env.CDN_AUDIT_PASSWORD || `Cd33!!${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}Aa`
const vmToken = process.env.CDN_VM_API_TOKEN || process.env.VM_API_TOKEN || ''
const cdnDbPassword = process.env.CDN_DB_PASSWORD
const apiDbPassword = process.env.API_DB_PASSWORD

if (!cdnDbPassword || !apiDbPassword) {
    console.error('CDN_DB_PASSWORD and API_DB_PASSWORD are required.')
    process.exit(1)
}

const cdnPool = new pg.Pool({
    host: process.env.CDN_DB_HOST || '127.0.0.1',
    port: Number(process.env.CDN_DB_PORT || 8502),
    database: process.env.CDN_DB || 'cdn',
    user: process.env.CDN_DB_USER || 'cdn',
    password: cdnDbPassword,
})
const apiPool = new pg.Pool({
    host: process.env.API_DB_HOST || '127.0.0.1',
    port: Number(process.env.API_DB_PORT || 8503),
    database: process.env.API_DB || 'hanasand',
    user: process.env.API_DB_USER || 'hanasand',
    password: apiDbPassword,
})
const results = []
let token = ''

function expectObject(body) {
    return body && typeof body === 'object' && !Array.isArray(body)
}

function expectArray(body) {
    return Array.isArray(body)
}

function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${token}`, id: runId, ...extra }
}

function vmHeaders(extra = {}) {
    return { Authorization: `Bearer ${encodeURIComponent(vmToken)}`, ...extra }
}

async function request(label, path, {
    base = cdnBase,
    method = 'GET',
    headers = {},
    body,
    rawBody,
    expectStatus = [200],
    expect = () => true,
} = {}) {
    const started = performance.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    let res
    try {
        res = await fetch(`${base}${path}`, {
            method,
            headers: {
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...headers,
            },
            body: rawBody || (body ? JSON.stringify(body) : undefined),
            signal: controller.signal,
        })
    } catch (error) {
        results.push({ label, method, path, status: 0, elapsed: Math.round(performance.now() - started), ok: false, shape: 'request-error', keys: '', body: String(error) })
        return { body: null, res: null }
    } finally {
        clearTimeout(timeout)
    }

    const elapsed = Math.round(performance.now() - started)
    const contentType = res.headers.get('content-type') || ''
    let parsed = contentType.includes('application/json') ? await res.json() : await res.text()
    const statuses = Array.isArray(expectStatus) ? expectStatus : [expectStatus]
    const ok = statuses.includes(res.status) && expect(parsed, res)
    results.push({
        label,
        method,
        path,
        status: res.status,
        elapsed,
        ok,
        shape: Array.isArray(parsed) ? `array(${parsed.length})` : typeof parsed,
        keys: expectObject(parsed) ? Object.keys(parsed).slice(0, 8).join(',') : '',
        body: ok ? undefined : parsed,
    })
    return { body: parsed, res }
}

async function waitFor(label, fn, { timeoutMs = 12000, intervalMs = 750 } = {}) {
    const started = Date.now()
    let lastError = null

    while (Date.now() - started < timeoutMs) {
        try {
            const value = await fn()
            if (value) {
                return value
            }
        } catch (error) {
            lastError = error
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    if (lastError) {
        throw lastError
    }

    throw new Error(`${label} timed out after ${timeoutMs}ms`)
}

async function cleanup() {
    await cdnPool.query('DELETE FROM project_group_members WHERE group_id LIKE $1', [`${runId}%`]).catch(() => {})
    await cdnPool.query('DELETE FROM project_groups WHERE owner = $1 OR id LIKE $2', [runId, `${runId}%`]).catch(() => {})
    await cdnPool.query('DELETE FROM shares WHERE owner = $1 OR id LIKE $2', [runId, `${runId}%`]).catch(() => {})
    await cdnPool.query('DELETE FROM links WHERE id LIKE $1', [`${runId}%`]).catch(() => {})
    await cdnPool.query('DELETE FROM files WHERE path LIKE $1 OR name LIKE $1', [`${runId}%`]).catch(() => {})
    await cdnPool.query('DELETE FROM blocklist WHERE owner = $1 OR value LIKE $2', [runId, `198.51.100.%`]).catch(() => {})
    await cdnPool.query('DELETE FROM request_logs WHERE domain = $1', [`${runId}.example`]).catch(() => {})
    await cdnPool.query('DELETE FROM request_logs_all WHERE domain = $1', [`${runId}.example`]).catch(() => {})
    await cdnPool.query('DELETE FROM request_metric_live_tps WHERE domain = $1', [`${runId}.example`]).catch(() => {})
    await cdnPool.query('DELETE FROM request_metric_recent_hourly WHERE metric_type = $1 AND metric_value = $2', ['domain', `${runId}.example`]).catch(() => {})
    await cdnPool.query('DELETE FROM request_metric_totals WHERE metric_type = $1 AND metric_value = $2', ['domain', `${runId}.example`]).catch(() => {})
    await apiPool.query('DELETE FROM user_roles WHERE user_id = $1', [runId]).catch(() => {})
    await apiPool.query('DELETE FROM tokens WHERE id = $1', [runId]).catch(() => {})
    await apiPool.query('DELETE FROM users WHERE id = $1', [runId]).catch(() => {})
}

async function setupUser() {
    const signup = await request('Hanasand POST /user', '/user', {
        base: apiBase,
        method: 'POST',
        body: { id: runId, name: 'CDN Audit', password },
        expectStatus: 201,
        expect: body => expectObject(body) && Boolean(body.token),
    })
    if (!signup.body?.token) {
        throw new Error(`Unable to create audit user: ${JSON.stringify(signup.body)}`)
    }
    await apiPool.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        SELECT $1, role_id, 'administrator'
        FROM unnest($2::text[]) AS role_id
        ON CONFLICT DO NOTHING
    `, [runId, ['users', 'system_admin']])
    const login = await request('Hanasand POST /auth/login/:id', `/auth/login/${runId}`, {
        base: apiBase,
        method: 'POST',
        body: { password },
        expect: body => expectObject(body) && Boolean(body.token),
    })
    if (!login.body?.token) {
        throw new Error(`Unable to log in audit user: ${JSON.stringify(login.body)}`)
    }
    token = login.body.token
}

async function main() {
    await cleanup()
    await setupUser()

    await request('GET /', '/', { expect: body => typeof body === 'string' || expectObject(body) })
    await request('GET /install.sh', '/install.sh', { expect: body => typeof body === 'string' })
    await request('GET /words', '/words', { expect: body => expectObject(body) && Array.isArray(body.words) })

    const fileForm = new FormData()
    fileForm.set('name', `${runId}.txt`)
    fileForm.set('description', 'audit file')
    fileForm.set('path', `${runId}/file.txt`)
    fileForm.set('type', 'text/plain')
    fileForm.set('file', new Blob(['cdn audit file'], { type: 'text/plain' }), `${runId}.txt`)
    const file = await request('POST /files', '/files', {
        method: 'POST',
        rawBody: fileForm,
        expect: body => expectObject(body) && Boolean(body.id),
    })
    await request('GET /files/check', `/files/check?path=${encodeURIComponent(`${runId}/file.txt`)}`, { expect: body => expectObject(body) && body.exists === true })
    await request('GET /files/:id', `/files/${file.body.id}`, { expect: body => typeof body === 'string' && body.includes('cdn audit file') })
    await request('GET /files/path/:id', `/files/path/${encodeURIComponent(`${runId}/file.txt`)}`, { expect: body => typeof body === 'string' && body.includes('cdn audit file') })

    const shareId = `${runId}_share`
    await request('POST /share', '/share', {
        method: 'POST',
        headers: authHeaders(),
        body: { id: shareId, name: 'Audit Share', content: '# Audit', type: 'file' },
        expectStatus: 201,
        expect: body => expectObject(body) && body.id === shareId,
    })
    await request('GET /share/:id', `/share/${shareId}`, { expect: body => expectObject(body) && body.id === shareId })
    await request('GET /share/user/:id', `/share/user/${runId}`, { headers: authHeaders(), expect: expectArray })
    await request('GET /share/tree/:id', `/share/tree/${shareId}`, { expect: body => expectObject(body) || expectArray(body) })
    await request('GET /share/editors/:id', `/share/editors/${shareId}`, { headers: authHeaders(), expect: expectArray })
    await request('GET /share/lock/:id', `/share/lock/${shareId}`, { headers: authHeaders(), expect: expectObject })
    await request('PUT /share/:id', `/share/${shareId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: { content: '# Audit updated' },
        expect: expectObject,
    })

    const group = await request('POST /project/group/:id', `/project/group/${runId}_group`, {
        method: 'POST',
        headers: authHeaders(),
        body: { name: 'Audit Group', description: 'audit' },
        expectStatus: 201,
        expect: body => expectObject(body) && Boolean(body.id),
    })
    await request('POST /project/group/add/:id', `/project/group/add/${group.body.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: { shareIds: [shareId], roles: ['member'] },
        expect: body => expectObject(body) && body.success === true,
    })
    await request('GET /project/group/:id', `/project/group/${group.body.id}`, { headers: authHeaders(), expect: expectArray })
    await request('GET /project/group/owner/:id', `/project/group/owner/${runId}`, { headers: authHeaders(), expect: expectArray })
    await request('GET /projects/user/:id', `/projects/user/${runId}`, { headers: authHeaders(), expect: expectArray })
    await request('GET /projects', '/projects', { headers: vmHeaders(), expect: expectArray })

    const linkId = `${runId}_link`
    await request('POST /link/:id', `/link/${linkId}`, {
        method: 'POST',
        body: { path: `/share/${shareId}` },
        expectStatus: 201,
        expect: body => expectObject(body) && body.id === linkId,
    })
    await request('GET /link/:id', `/link/${linkId}`, { expect: body => expectObject(body) && body.id === linkId })

    const block = await request('POST /blocklist', '/blocklist', {
        method: 'POST',
        headers: authHeaders(),
        body: { metric: 'ip', value: '198.51.100.42' },
        expectStatus: [200, 201],
        expect: expectObject,
    })
    await request('GET /blocklist', '/blocklist', { headers: authHeaders(), expect: expectArray })
    await request('GET /blocklist/overview', '/blocklist/overview', { headers: authHeaders(), expect: expectArray })
    await request('GET /blocklist/nginx', '/blocklist/nginx', { headers: authHeaders(), expect: expectArray })
    if (block.body?.id) {
        await request('PUT /blocklist/:id', `/blocklist/${block.body.id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: { is_proxy: true },
            expect: expectObject,
        })
        await request('DELETE /blocklist/:id', `/blocklist/${block.body.id}`, {
            method: 'DELETE',
            headers: authHeaders(),
            expect: expectObject,
        })
    }

    await request('POST /traffic', '/traffic', {
        method: 'POST',
        headers: { 'User-Agent': 'Hanasand Traffic Logger audit' },
        body: { domain: `${runId}.example`, ip: '198.51.100.43', user_agent: 'Audit UA', path: '/audit', method: 'GET' },
        expectStatus: 201,
        expect: expectObject,
    })
    await request('GET /traffic/summary', '/traffic/summary', { expect: body => expectObject(body) || expectArray(body) })
    await waitFor('traffic tps to include audit domain', async () => {
        const result = await request('GET /traffic/tps?fresh=1', '/traffic/tps?fresh=1', {
            expect: body => expectArray(body) && body.some(entry => entry.name === `${runId}.example` && Number(entry.tps) > 0),
        })
        return Array.isArray(result.body) && result.body.some(entry => entry.name === `${runId}.example` && Number(entry.tps) > 0)
            ? result.body
            : null
    })
    await request('GET /traffic/ips', '/traffic/ips', { headers: authHeaders(), expect: expectArray })
    await request('GET /traffic/uas', '/traffic/uas', { headers: authHeaders(), expect: expectArray })
    await request('GET /traffic/recent', '/traffic/recent', { headers: authHeaders(), expect: expectArray })

    await request('DELETE /share/:id', `/share/${shareId}`, { method: 'DELETE', headers: authHeaders(), expectStatus: [200, 404], expect: expectObject })
    await request('DELETE /files/:id', `/files/${file.body.id}`, { method: 'DELETE', headers: authHeaders(), expectStatus: [200, 401, 404], expect: expectObject })
    await request('DELETE /project/group/:id', `/project/group/${group.body.id}`, { method: 'DELETE', headers: authHeaders(), expectStatus: [200, 404], expect: expectObject })

    const failed = results.filter(result => !result.ok)
    console.table(results.map(({ body, ...result }) => result))
    if (failed.length) {
        console.error(JSON.stringify(failed, null, 2))
        process.exitCode = 1
    }
    await cleanup()
}

main()
    .catch(error => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await Promise.all([cdnPool.end(), apiPool.end()])
    })
