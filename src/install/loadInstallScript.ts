import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function loadInstallScript() {
    const filePath = path.join(__dirname, '..', 'static', 'install.sh')
    try {
        return Buffer.from(fs.readFileSync(filePath))
    } catch (error) {
        console.error('Failed to read install.sh:', error)
        return Buffer.from('')
    }
}
