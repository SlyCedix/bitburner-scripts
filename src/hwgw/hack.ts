import { NS } from '../../NetscriptDefinitions'

export async function main(ns: NS): Promise<void> {
    await ns.sleep(ns.args[1] as number)
    await ns.hack(ns.args[0] as string)
}