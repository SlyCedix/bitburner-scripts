import { NS } from '@ns'
import { getMostExpensiveAugment } from '/lib/singularity.js'

export async function main(ns: NS): Promise<void> {
    ns.tprintf(`${JSON.stringify(getMostExpensiveAugment(ns), null, 2)}`)
}