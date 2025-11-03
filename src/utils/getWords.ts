import words from "../static/words.json" with { "type": "json" }

const defaultQuery = {
    categories: 'animals,fruits,numbers,cities',
    count: '1',
    maxLength: '20',
}

export default function getWords(query: { categories: string, count: string, maxLength: string } = defaultQuery) {
    const { animals, fruits, numbers, cities } = words
    const {
        categories: catQuery = 'animals,fruits,numbers,cities',
        count = '1',
        maxLength = '20',
    } = query

    const selectedCategories = catQuery.split(",").map(c => c.trim().toLowerCase())
    const countNum = Math.min(Math.max(parseInt(count), 1), 100)
    const maxLen = parseInt(maxLength)
    const categoryMap: Record<string, string[]> = { animals, fruits, numbers, cities }

    if (!selectedCategories.includes("cities")) {
        selectedCategories.push("cities")
    }

    const results: string[] = []

    for (let i = 0; i < countNum; i++) {
        let name = ""
        let attempts = 0

        while (attempts < 10000) {
            const word3 = cities[Math.floor(Math.random() * cities.length)]
            const otherCats = selectedCategories.filter(c => c !== "cities")

            let word1 = ""
            let word2 = ""

            if (otherCats.length >= 2) {
                const shuffled = otherCats.sort(() => 0.5 - Math.random())
                word1 = categoryMap[shuffled[0]][Math.floor(Math.random() * categoryMap[shuffled[0]].length)]
                word2 = categoryMap[shuffled[1]][Math.floor(Math.random() * categoryMap[shuffled[1]].length)]
            } else if (otherCats.length === 1) {
                word1 = categoryMap[otherCats[0]][Math.floor(Math.random() * categoryMap[otherCats[0]].length)]
            }

            name = [word1, word2, word3].filter(Boolean).join("-")

            if (name.length <= maxLen) {
                break
            }

            attempts++
        }

        if (name.length > maxLen) {
            name = cities[Math.floor(Math.random() * cities.length)]
        }

        results.push(name)
    }

    return results
}
