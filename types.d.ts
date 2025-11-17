type SQLParamType = (string | number | null | boolean | string[] | Date | Buffer)[]

type Share = {
    id: string
    path: string
    content: string
    wordCount: string
    timestamp: string
    git: string
    locked: boolean
    owner: string
    parent: string
}

type VM = {

}

type User = {
    id: string
    name: string
    avatar: string
}

type FileItemBase = {
    id: string
    name: string
    alias: string | null
    parent: string | null
}

type FileFile = FileItemBase & {
    type: 'file'
}

type FileFolder = FileItemBase & {
    type: 'folder'
    children: FileItem[]
}

type FileItem = FileFile | FileFolder
