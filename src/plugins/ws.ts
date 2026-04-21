import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import run from '#db'
import registerClient from '#utils/ws/registerClient.ts'
import removeClient from '#utils/ws/removeClient.ts'
import handleShareMessage from '#utils/ws/handleShareMessage.ts'
import handleTerminalMessage from '#utils/ws/handleTerminalMessage.ts'
import followShell, { shellClients } from '#utils/ws/followShell.ts'

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
                const { name, user } = (req.params as { id: string, name: string, user: string })
                const roomId = name

                registerClient(roomId, connection, shellClients)

                const previousLog = await run(
                    'SELECT last_log FROM vms WHERE project_id = $1',
                    [roomId]
                )
                const previousLines = previousLog.rows[0]?.last_log as string[] | undefined
                if (Array.isArray(previousLines)) {
                    previousLines.forEach((content) => {
                        connection.send(JSON.stringify({
                            type: 'update',
                            content,
                            timestamp: new Date().toISOString(),
                            participants: shellClients.get(roomId)?.size || 1
                        }))
                    })
                }

                followShell(connection, roomId, name, user)

                connection.on('message', (message) => {
                    handleTerminalMessage(roomId, connection, message)
                })

                connection.on('error', (error) => {
                    removeClient(roomId, connection, shellClients)
                    console.log(error)
                })

                connection.on('close', () => {
                    removeClient(roomId, connection, shellClients)
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
                        const domains = JSON.parse(fastify.cachedTPS.data.toString())
                        connection.send(JSON.stringify({ type: 'update', data: domains }))
                    } catch (error) {
                        console.error('Error fetching domain TPS:', error)
                    }
                }, 2000)

                connection.on('close', () => {
                    clearInterval(interval)
                    removeClient(id, connection)
                })

                connection.on('error', (error) => {
                    clearInterval(interval)
                    removeClient(id, connection)
                    console.log('WebSocket error:', error)
                })
            } catch (error) {
                console.error('WebSocket setup error:', error)
                connection.send(JSON.stringify({ error: 'Failed to start domain TPS websocket' }))
            }
        })

    })
})
