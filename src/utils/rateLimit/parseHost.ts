export default function parseHost(value: string) {
    if (!value) {
        return ''
    }

    try {
        return new URL(value).hostname.toLowerCase()
    } catch {
        return ''
    }
}
