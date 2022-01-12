import { NS } from '@ns'
import { levelAllFactions } from '/lib/singularity.js'

export async function main(ns: NS): Promise<void> {
    await levelAllFactions(ns)
}