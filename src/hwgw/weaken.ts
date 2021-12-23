import { NS } from '../../NetscriptDefinitions'

export async function main(ns : NS) : Promise<void> {
    while (true) {
        await ns.sleep(Number(ns.args[1]))
        await ns.weaken(ns.args[0].toString())
    }
}