import { NS } from '../../NetscriptDefinitions'

export async function main(ns: NS): Promise<void> {
    await ns.sleep(ns.args[1] as number)
    await ns.grow(ns.args[0] as string)
}