import config from '#constants'

export default async function tokenWrapper(id: string, token: string): Promise<{ status: boolean, id: string | null }> {
    try {
        const response = await fetch(`${config.api}/auth/token/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        if (!response.ok) {
            if (response.status === 401) {
                return { status: false, id: null }
            }

            throw new Error(await response.text())
        }

        const data = await response.json() as User
        return { status: true, id: data.id }
    } catch (error) {
        console.log(error)
        return { status: false, id: null }
    }
}
