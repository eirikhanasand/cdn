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

const config = {
    DB_PORT: process.env.DB_PORT,
    DB_MAX_CONN: process.env.DB_MAX_CONN,
    DB_IDLE_TIMEOUT_MS: process.env.DB_IDLE_TIMEOUT_MS,
    DB_TIMEOUT_MS: process.env.DB_TIMEOUT_MS,
    DB_CACHE_TTL: 1000,
    DB: process.env.DB,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    CACHE_TTL_HOT: 5000,
    CACHE_TTL_COLD: 300000,
    api: 'https://api.hanasand.com/api',
    // api: 'http://localhost:8080/api',
    internal_api: 'https://internal.hanasand.com/api',
    internal_wss: 'wss://internal.hanasand.com/api/ws',
    vm_token: process.env.VM_TOKEN,
    vm_api_token: process.env.VM_API_TOKEN
}

export default config
