import { NS } from '@ns'
import { backdoorAll } from '/lib/singularity.js'

export async function main(ns: NS): Promise<void> {
    const count = await backdoorAll(ns)

    if (count) ns.tprintf(`SUCCESS: Backdoored ${count} servers`)
    else ns.tprintf('ERROR: Could not find any servers to backdoor')
}