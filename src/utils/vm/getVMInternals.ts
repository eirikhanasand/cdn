import config from '#constants'

export default async function getVMInternals(name: string) {
    try {
        const authHeader = buildBearerHeader(config.vm_token)
        if (!authHeader) {
            console.warn('Skipping VM metadata refresh because VM_TOKEN is not safe for an HTTP header.')
            return null
        }

        const response = await fetch(`${config.internal_api}/vm/${name}`, {
            headers: {
                'Authorization': authHeader
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

function buildBearerHeader(token: string | undefined) {
    if (!token) {
        return null
    }

    const value = `Bearer ${token}`
    return /^[\x20-\x7E]+$/.test(value) ? value : null
}
