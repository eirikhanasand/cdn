import run from '#db'
import { loadSQL } from '#utils/loadSQL.ts'

type PermissionsProps = {
    userId: string
    fileId: string
}

type Permissions = {
    id: string
    alias: string
    path: string
    owner: string
    editors: string[]
}

export default async function filePermissionsWrapper({ userId, fileId }: PermissionsProps): Promise<{ status: boolean, permissions: string[] | null }> {
    const query = await loadSQL('checkFilePermissions.sql')
    const result = await run(query, [userId, fileId])
    const data = result.rows[0] as Permissions

    if (data.owner !== userId && !data.editors.includes(userId)) {
        return { status: false, permissions: null }
    }

    const permissions = []
    const owner = data.owner === userId
    const editor = data.editors.includes(userId)

    if (owner) {
        permissions.push('owner')
    }

    if (editor) {
        permissions.push('editor')
    }

    return { status: true, permissions }
}
