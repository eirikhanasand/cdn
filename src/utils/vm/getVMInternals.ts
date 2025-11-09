import config from '#constants'

export default async function getVMInternals(name: string) {
    try {
        const response = await fetch(`${config.internal_api}/vm/${name}`, {
            headers: {
                'Authorization': `Bearer ${config.vm_token}`
            }
        })

        if (!response.ok) {
            throw new Error(await response.text())
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.log(error)
        return null
    }
}
