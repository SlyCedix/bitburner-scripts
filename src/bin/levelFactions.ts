import { NS } from '@ns'
import { levelAllFactions } from 'lib/singularity'

export async function main(ns: NS): Promise<void> {
    const focus = ns.args[0] as boolean ?? false

    await levelAllFactions(ns, focus)
}