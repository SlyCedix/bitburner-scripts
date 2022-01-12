import { NS } from '@ns'
import { findServer, getServersWithoutBackdoor } from 'lib/helpers'

/**
 * Backdoors every server using singularity
 * @param ns
 * @returns Number of servers backdoored
 */
export async function backdoorAll(ns: NS): Promise<number> {
    const servers = getServersWithoutBackdoor(ns)
    let count = 0

    for (const server of servers) {
        connectToServer(ns, server)
        await ns.installBackdoor()
        ns.tprintf(`SUCCESS: ${server} has been backdoored`)
        ++count
    }

    return count
}

/**
 * Connects terminal from current server to target server
 * @param ns
 * @param target server to connect to
 * @returns true if successful, false otherwise
 */
export function connectToServer(ns: NS, target: string): boolean {
    if (!ns.serverExists(target)) return false

    const path = findServer(ns, target, ns.getCurrentServer())
    for (const node of path) {
        ns.connect(node)
    }
    return true
}

/**
 * @returns Array of all faction names
 */
export function getAllFactions(): string[] {
    return [
        'CyberSec',
        'Tian Di Hui',
        'Netburners',
        'Sector-12',
        'Chongqing',
        'New Tokyo',
        'Ishima',
        'Aevum',
        'Volhaven',
        'NiteSec',
        'The Black Hand',
        'BitRunners',
        'ECorp',
        'MegaCorp',
        'KuaiGong International',
        'Four Sigma',
        'NWO',
        'Blade Industries',
        'OmniTek Incorporated',
        'Bachman & Associates',
        'Clarke Incorporated',
        'Fulcrum Secret Technologies',
        'Slum Snakes',
        'Tetrads',
        'Silhouette',
        'Speakers for the Dead',
        'The Dark Army',
        'The Syndicate',
        'The Covenant',
        'Daedalus',
        'Illuminati',
    ]
}

/**
 * @param ns
 * @returns All augments from every faction, grouped by augment
 */
export function getAllAugments(ns: NS): { factions: string[]; name: string }[] {
    const factions = getAllFactions()

    const augments: Array<{ factions: string[]; name: string }> = []

    for (const faction of factions) {
        const factionAugs = ns.getAugmentationsFromFaction(faction)
        for (const aug of factionAugs) {
            const augMatch = augments.filter(a => a.name == aug)
            if (augMatch.length == 0) augments.push({ factions: [faction], name: aug })
            else augMatch[0].factions.push(faction)
        }
    }

    return augments
}
/**
 * @param ns
 * @returns Array of all factions which have any amount of rep
 */
export function getJoinedFactions(ns: NS): string[] {
    return getAllFactions().filter(f => ns.getFactionRep(f) > 0)
}

/**
 * Loops through every faction joined and attempts to level them until a reset would give 150 favor
 * @param ns
 */
export async function levelAllFactions(ns: NS): Promise<void> {
    const factions = getJoinedFactions(ns)

    for (const faction of factions) {
        if (ns.getFactionFavor(faction) >= 150) {
            ns.donateToFaction(faction, 2e12)
            continue
        }

        while (ns.getFactionFavor(faction) + ns.getFactionFavorGain(faction) < 150) {
            ns.workForFaction(faction, 'Hacking Contracts', false)
            await ns.sleep(60000)
        }
    }
}

/**
 * @param ns
 * @returns Array of all joined factions and their associated unowned augments
 */
export function getPurchaseableAugments(ns: NS): { faction: string, augments: string[] }[] {
    return getJoinedFactions(ns)
        .map(f => {
            const augments = ns.getAugmentationsFromFaction(f)
                .filter(a => !ns.getOwnedAugmentations(true).includes(a))
                .filter(a => ns.getAugmentationRepReq(a) <= ns.getFactionRep(f))
                .filter(a => {
                    const prereqs = ns.getAugmentationPrereq(a)
                    if (prereqs.length == 0) return true
                    const ownership = prereqs.map(prereq => ns.getOwnedAugmentations().includes(prereq))
                    return !ownership.includes(false)
                })
            return { faction: f, augments: augments }
        }).filter(x => x.augments.length != 0)
}

/**
 * @param ns
 * @returns the most expensive augment along with the list of factions that carry it
 */
export function getMostExpensiveAugment(ns: NS): { factions: string[], augment: string, cost: number } {
    let maxCost = 0
    const bestAugment = {
        factions: new Array<string>(),
        augment: '',
        cost: 0
    }
    const factionAugs = getPurchaseableAugments(ns)
    for (const augs of factionAugs) {
        const mostExpensive = augs.augments
            .reduce((a, b) => ns.getAugmentationPrice(a) > ns.getAugmentationPrice(b) ? a : b)
        const price = ns.getAugmentationPrice(mostExpensive)
        if (mostExpensive == bestAugment.augment) {
            bestAugment.factions.push(augs.faction)
        } else if (price > maxCost) {
            maxCost = price
            bestAugment.factions = [augs.faction]
            bestAugment.augment = mostExpensive
            bestAugment.cost = price
        }
    }

    return bestAugment
}

/**
 * @param ns
 * @param faction name of faction to check
 * @returns true if faction has any augments to purchase besides Neuroflux, false otherwise
 */
export function factionHasAugs(ns: NS, faction: string): boolean {
    return ns.getAugmentationsFromFaction(faction)
        .filter(a => !ns.getOwnedAugmentations(true).includes(a))
        .length > 1
}

/**
 * @returns an array of all crimes
 */
export function getAllCrimes(): string[] {
    return [
        'Shoplift',
        'Rob store',
        'Mug someone',
        'Larceny',
        'Deal Drugs',
        'Traffick illegal Arms',
        'Homicide',
        'Grand theft Auto',
        'Kidnap and Ransom',
        'Assassinate',
        'Heist'
    ]
}

/**
 * @param ns
 * @param chanceThresh Minimum crime success chance to include in calculations
 * @returns crime with maximum karma/second
 */
export function getBestKarmaCrime(ns: NS, chanceThresh = 1): string {
    const crimes = getAllCrimes().filter(c => ns.getCrimeChance(c) >= chanceThresh)
    if (crimes.length == 0) return getAllCrimes()[0]

    return crimes.reduce((a, b) => {
        const aStats = ns.getCrimeStats(a)
        const bStats = ns.getCrimeStats(b)

        const aRate = aStats.karma / aStats.time
        const bRate = bStats.karma / bStats.time

        return aRate > bRate ? a : b
    })
}