import { NS } from '@ns'
import { factionHasAugs } from 'lib/singularity'

export function main(ns: NS): void {
    ns.checkFactionInvitations()
        .filter(f => factionHasAugs(ns, f))
        .forEach(f => ns.joinFaction(f))
}