import { NS } from '../../bitburner/src/ScriptEditor/NetscriptDefinitions'

export async function main(ns : NS) : Promise<void> {
    while (true) {
        await ns.sleep(Number(ns.args[1]))
        await ns.hack(ns.args[0].toString())
    }
}