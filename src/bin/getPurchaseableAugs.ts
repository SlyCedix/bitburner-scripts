import { NS } from '@ns'
import { getPurchaseableAugments } from '/lib/singularity.js'

export async function main(ns: NS): Promise<void> {
    ns.tprintf(`${JSON.stringify(getPurchaseableAugments(ns), null, 2)}`)
}