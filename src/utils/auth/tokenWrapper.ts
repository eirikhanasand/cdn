import config from '#constants'

export default async function tokenWrapper(id: string, token: string): Promise<{ status: boolean, id: string | null }> {
    try {
        const response = await fetch(`${config.api}/auth/token/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        if (!response.ok) {
            throw new Error('')
        }

        const data = await response.json() as User
        return { status: true, id: data.id }
    } catch (error) {
        console.log(error)
        return { status: false, id: null }
    }
}
