import config from '#constants'
import getVMInternals from './getVMInternals'

export default async function updateVM(name: string) {
    try {
        const internals = await getVMInternals(name)
        if (!internals) {
            console.log(`DNS lookup for VM ${name} failed.`)
        }

        const vm = { ...internals, name, owner: name, access_users: [], created_by: name }
        const response = await fetch(`${config.api}/api/vm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.vm_api_token}`
            },
            body: JSON.stringify(vm)
        })
        if (!response.ok) {
            throw new Error(`Failed to update vm ${name}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.log(error)
        return null
    }
}
