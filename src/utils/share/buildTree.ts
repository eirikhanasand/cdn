export default function buildTree(items: FileItem[]): FileItem[] {
    const map = new Map<string, FileItem>(
        items.map(i => [i.id, i.type === 'folder' ? { ...i, children: [] } : i])
    )

    const tree: FileItem[] = []
    for (const item of items) {
        const node = map.get(item.id)!
        if (item.parent) {
            const parent = map.get(item.parent)
            if (parent && parent.type === 'folder') {
                parent.children.push(node)
            }
        } else {
            tree.push(node)
        }
    }

    return tree
}
