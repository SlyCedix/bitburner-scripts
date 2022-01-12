import { NS } from '@ns'
import { factionHasAugs } from 'lib/singularity'

export async function main(ns: NS): Promise<void> {
    ns.checkFactionInvitations()
        .filter(f => factionHasAugs(ns, f))
        .forEach(f => ns.joinFaction(f))
}