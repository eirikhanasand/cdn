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
