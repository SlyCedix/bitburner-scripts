import { NS } from '@ns'
import { getJoinedFactions,factionHasAugs, levelAllFactions, augmentationReset } from '/lib/singularity'

export async function main(ns : NS) : Promise<void> {
    while(getJoinedFactions(ns).length < 2) {
        const invs = ns.checkFactionInvitations()
            .filter(f => factionHasAugs(ns, f))

        if(invs.length > 0) ns.joinFaction(invs[0])

        await ns.sleep(10000)
    }

    const hasNeuroreceptor = ns.getOwnedAugmentations().includes('Neuroreceptor Management Implant')

    await levelAllFactions(ns, !hasNeuroreceptor)

    await augmentationReset(ns)
}