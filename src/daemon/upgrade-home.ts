import { NS } from '@ns'
import { upgradeHomeServer } from 'lib/singularity'

export async function main(ns: NS): Promise<void> {
    while (true) {
        upgradeHomeServer(ns)
        await ns.sleep(60000)
    }
}