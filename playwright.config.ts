import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    use: {
        baseURL: process.env.CDN_BASE || 'http://127.0.0.1:8501/api',
    },
})
