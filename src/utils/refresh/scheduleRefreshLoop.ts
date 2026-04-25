export default function scheduleRefreshLoop(task: () => Promise<void>, delayMs: number) {
    const runTask = async () => {
        try {
            await task()
        } finally {
            setTimeout(runTask, delayMs)
        }
    }

    setTimeout(runTask, 0)
}
