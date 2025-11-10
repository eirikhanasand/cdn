import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import registerClient from '#utils/ws/registerClient.ts'
import removeClient from '#utils/ws/removeClient.ts'
import handleShareMessage from '#utils/ws/handleShareMessage.ts'
import handleTerminalMessage from '#utils/ws/handleTerminalMessage.ts'
import followShell from '#utils/ws/followShell.ts'
import run from '#db'
// import run from '#db'
// import { loadSQL } from '#utils/loadSQL.ts'

export default fp(async function wsSharePlugin(fastify: FastifyInstance) {
    fastify.register(async function (fastify) {
        fastify.get('/api/ws/share/:id', { websocket: true }, (connection, req: FastifyRequest) => {
            const id = (req.params as { id: string }).id

            registerClient(id, connection)
            connection.on('message', message => {
                handleShareMessage(id, connection, message)
            })

            connection.on('error', (error) => {
                console.log(`Connection error: ${error}`)
            })

            connection.on('close', () => {
                removeClient(id, connection)
            })
        })

        fastify.get('/api/ws/share/:name/shell/:user/:id', { websocket: true }, async (connection, req: FastifyRequest) => {
            try {
                const { id, name, user } = (req.params as { id: string, name: string, user: string })
                registerClient(id, connection)
                // const query = await loadSQL('getAncestor.sql')
                // const ancestorResult = await run(query, [id])
                // const ancestorId = ancestorResult.rows[0]?.id

                // stores the last output from the vm
                // const result = await run('SELECT * FROM vms WHERE project_id = $1', [ancestorId])
                // const vm: VM = result.rows[0]
                // if (!vm) {
                //     const createVM = await 
                //     const result = await run('INSERT INTO vms (project_id, vm_id, last_log) VALUES ($1, $2, \'{}\');')
                // } else {
                //     followShell(name, 'bash', connection)
                // }

                followShell(connection, id, name, user)

                connection.on('message', (message) => {
                    handleTerminalMessage(id, connection, message)
                })

                connection.on('error', (error) => {
                    removeClient(id, connection)
                    console.log(error)
                })

                connection.on('close', () => {
                    removeClient(id, connection)
                })
            } catch (error) {
                connection.send(Buffer.from(JSON.stringify(error)))
                console.log(error)
            }
        })

        fastify.get('/api/ws/tps/:id', { websocket: true }, async (connection, req: FastifyRequest) => {
            const { id } = req.params as { id: string }
            registerClient(id, connection)

            try {
                const interval = setInterval(async () => {
                    try {
                        const realTimeQuery = `
                            SELECT
                                domain,
                                SUM(hits) AS hits,
                                SUM(hits) / 30.0 AS tps
                            FROM request_logs
                            WHERE last_seen >= NOW() - INTERVAL '30 seconds'
                            GROUP BY domain
                            ORDER BY domain;
                        `
                        let result = await run(realTimeQuery)

                        const domains = result.rows.map(row => ({
                            name: row.domain,
                            hits: Number(row.hits),
                            tps: Number(row.tps),
                        }))

                        const lowTrafficDomains = domains.filter(d => d.tps < 3)
                        if (lowTrafficDomains.length > 0) {
                            const names = lowTrafficDomains.map(d => `'${d.name}'`).join(',')
                            const fallbackQuery = `
                                SELECT
                                    domain,
                                    SUM(hits) AS hits,
                                    SUM(hits) / 30.0 AS tps  -- aggregate over last 30 seconds
                                FROM request_logs
                                WHERE last_seen >= NOW() - INTERVAL '30 seconds'
                                AND domain IN (${names})
                                GROUP BY domain
                            `
                            const fallbackResult = await run(fallbackQuery)
                            fallbackResult.rows.forEach(row => {
                                const idx = domains.findIndex(d => d.name === row.domain)
                                if (idx >= 0) {
                                    domains[idx].hits = Number(row.hits)
                                    domains[idx].tps = Number(row.tps)
                                }
                            })
                        }

                        connection.send(JSON.stringify({ type: 'update', data: domains }))
                    } catch (err) {
                        console.error('Error fetching domain TPS:', err)
                    }
                }, 500)

                connection.on('close', () => {
                    clearInterval(interval)
                    removeClient(id, connection)
                })

                connection.on('error', (err) => {
                    clearInterval(interval)
                    removeClient(id, connection)
                    console.log(`WebSocket error: ${err}`)
                })
            } catch (error) {
                console.error('WebSocket setup error:', error)
                connection.send(JSON.stringify({ error: 'Failed to start domain TPS websocket' }))
            }
        })

    })
})
