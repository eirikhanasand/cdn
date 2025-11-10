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
            const { id } = (req.params as { id: string })
            registerClient(id, connection)

            try {
                const interval = setInterval(async () => {
                    try {
                        const query = `
                            SELECT domain, SUM(hits) AS hits
                            FROM request_logs
                            GROUP BY domain
                            ORDER BY domain
                        `
                        const result = await run(query)
                        const domains = result.rows.map((row) => ({
                            name: row.domain,
                            tps: Number(row.hits),
                        }))
                        connection.send(JSON.stringify(domains))
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
