export default function getPathname(url: string) {
    try {
        return new URL(url, 'http://cdn.local').pathname
    } catch {
        return url.split('?')[0] || '/'
    }
}
