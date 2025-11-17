import run from '#db'
import loadSQL from '#utils/loadSQL.ts'

type PermissionsProps = {
    userId: string
    shareId: string
}

type Permissions = {
    id: string
    alias: string
    path: string
    owner: string
    editors?: string[]
}

type PermissionsWrapperResponse = { 
    status: boolean
    permissions: string[] | null
}

export default async function permissionsWrapper({ userId, shareId }: PermissionsProps): Promise<PermissionsWrapperResponse> {
    const query = await loadSQL('checkPermissions.sql')
    const result = await run(query, [userId, shareId])
    console.log(result)
    console.log(result.rows[0])
    const data = result.rows[0] as Permissions
    const editors = Array.isArray(data?.editors) ? data.editors : []

    if (data.owner !== userId && !editors.includes(userId)) {
        return { status: false, permissions: null }
    }

    const permissions = []
    const owner = data.owner === userId
    const editor = editors.includes(userId)

    if (owner) {
        permissions.push('owner')
    }

    if (editor) {
        permissions.push('editor')
    }

    return { status: true, permissions }
}
