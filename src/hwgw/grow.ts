import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const sleep = (ms: number): Promise<void> => {
        const ret: Promise<void> = new Promise(resolve => setTimeout(resolve, ms))
        ns.print(`sleep: Sleeping for ${Math.floor(ms)} milliseconds`)
        return ret
    }

    await sleep((ns.args[1] as number) - performance.now())
    await ns.grow(ns.args[0] as string)
}