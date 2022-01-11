import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const sleep = (ms: number): Promise<void> => {
        const ret: Promise<void> = new Promise(resolve => setTimeout(resolve, ms))
        ns.print(`sleep: Sleeping for ${Math.floor(ms)} milliseconds`)
        return ret
    }

    let start = performance.now()
    await sleep((ns.args[1] as number) - performance.now())
    ns.print(`INFO: Sleep took ${performance.now() - start}`)

    start = performance.now()
    await ns.hack(ns.args[0] as string)
    ns.print(`INFO: Hack took ${performance.now() - start}`)
}