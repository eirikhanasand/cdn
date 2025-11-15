import dotenv from 'dotenv'

dotenv.config()

const requiredEnvironmentVariables = [
    'DB_PASSWORD',
    'DB_HOST',
    'VM_TOKEN',
    'VM_API_TOKEN'
]

const missingVariables = requiredEnvironmentVariables.filter(
    (key) => !process.env[key]
)

if (missingVariables.length > 0) {
    const missingVariablesStringified = missingVariables
        .map((key) => `${key}: ${process.env[key] || 'undefined'}`)
        .join('\n')

    throw new Error(
        `Missing essential environment variables:\n${missingVariablesStringified}`
    )
}

const env = Object.fromEntries(
    requiredEnvironmentVariables.map((key) => [key, process.env[key]])
)

const config = {
    DB_PORT: env.DB_PORT,
    DB_MAX_CONN: env.DB_MAX_CONN,
    DB_IDLE_TIMEOUT_MS: env.DB_IDLE_TIMEOUT_MS,
    DB_TIMEOUT_MS: env.DB_TIMEOUT_MS,
    DB: env.DB,
    DB_HOST: env.DB_HOST,
    DB_USER: env.DB_USER,
    DB_PASSWORD: env.DB_PASSWORD,
    DB_CACHE_TTL: 30000,
    CACHE_TTL: 60000,
    api: 'https://api.hanasand.com/api',
    // api: 'http://localhost:8080/api',
    internal_api: 'https://internal.hanasand.com/api',
    internal_wss: 'wss://internal.hanasand.com/api/ws',
    vm_token: env.VM_TOKEN,
    vm_api_token: env.VM_API_TOKEN
}

export default config
