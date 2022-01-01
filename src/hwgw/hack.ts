import { NS } from '../../NetscriptDefinitions'

export async function main(ns: NS): Promise<void> {
    const sleep = (ms : number) : Promise<void> => {
        return new Promise(resolve => setTimeout(resolve,ms))
    }

    await sleep(ns.args[1] as number)
    await ns.hack(ns.args[0] as string)
}