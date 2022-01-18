import { NS } from '@ns'
import { backdoorAll } from '/lib/singularity'

export async function main(ns : NS) : Promise<void> {
    while(true) {
        await backdoorAll(ns)
        await ns.sleep(60000)
    }
}