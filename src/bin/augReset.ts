import { NS } from '@ns'
import { getMostExpensiveAugment } from 'lib/singularity'

export async function main(ns: NS): Promise<void> {
    let bestAugment = getMostExpensiveAugment(ns)
    while (bestAugment.cost != 0) {
        ns.purchaseAugmentation(bestAugment.factions[0], bestAugment.augment)
        await ns.sleep(0)
        bestAugment = getMostExpensiveAugment(ns)
    }

    if (await ns.prompt('All augmentations purchased, install?')) {
        ns.installAugmentations('main.js')
    }
}