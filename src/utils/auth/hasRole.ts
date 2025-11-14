import config from '#constants'

export default async function hasRole({ id, role }: { id: string, role: string }): Promise<boolean> {
    try {
        const response = await fetch(`${config.api}/roles/user/${id}`)
        if (!response.ok) {
            throw new Error(await response.text())
        }

        const data = await response.json()
        if ('roles' in data && Array.isArray(data.roles)) {
            if (data.roles.includes(role)) {
                return true
            }
        }

        return false
    } catch (error) {
        console.log(error)
        return false
    }
}
