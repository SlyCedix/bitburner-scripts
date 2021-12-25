import { NS } from '../../NetscriptDefinitions'

export async function main(ns: NS): Promise<void> {
    await ns.grow(ns.args[0] as string)
}