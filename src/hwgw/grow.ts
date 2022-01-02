import { NS } from '../../NetscriptDefinitions'

export async function main(ns: NS): Promise<void> {
    const sleep = (ms : number) : Promise<void> => {
        return new Promise(resolve => setTimeout(resolve,ms))
    }

    const sleepTime = (ns.args[1] as number) - performance.now() 

    await sleep(sleepTime)
    await ns.grow(ns.args[0] as string)
}