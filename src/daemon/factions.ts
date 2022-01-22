import { NS } from '@ns'
import { karmaNS } from '@types'
import {
    getJoinedFactions,
    levelAllFactions,
    augmentationReset,
    getNextFaction,
    fulfillFactionRequirements,
} from '/lib/singularity'

export async function main(ns : NS) : Promise<void> {
    while(getJoinedFactions(ns).length < 2) {
        const next = getNextFaction(ns)
        if(!ns.checkFactionInvitations().includes(next)) await fulfillFactionRequirements(ns as karmaNS, next)
        ns.joinFaction(next)
        await ns.sleep(10000)
    }

    const hasNeuroreceptor = ns.getOwnedAugmentations().includes('Neuroreceptor Management Implant')

    await levelAllFactions(ns, !hasNeuroreceptor)

    await augmentationReset(ns)
}