import { NS } from '../../NetscriptDefinitions'
import { backdoorAll } from '/lib/helpers.js'

export async function main(ns : NS) : Promise<void> {
    const count = await backdoorAll(ns)

    count ? ns.tprintf(`SUCCESS: Backdoored ${count} servers`) : ns.tprintf('ERROR: Could not find any servers to backdoor')
}