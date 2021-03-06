import { CrimeStats, NS } from '@ns'
import { FactionRequirements, karmaNS } from '@types'
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
        'Sector-12',
        'Aevum',
        'New Tokyo',
        'NiteSec',
        'Ishima',
        'The Black Hand',
        'Chongqing',
        'BitRunners',
        'Volhaven',
        'Daedalus',
        'Slum Snakes',
        'Tetrads',
        'Speakers for the Dead',
        'The Dark Army',
        'The Syndicate',
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
        'The Covenant',
        'Illuminati',
        'Silhouette',
        'Netburners',
    ]
}

export function getNextFaction(ns: NS): string {
    const joinedFactions = getJoinedFactions(ns)
    const factions = getAllFactions().filter(f => !joinedFactions.includes(f) && factionHasAugs(ns, f))
    return factions[0]
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
    return ns.getPlayer().factions
}

/**
 * Loops through every faction joined and attempts to level them until a reset would give 150 favor
 * @param ns
 */
export async function levelAllFactions(ns: NS, focus = false): Promise<void> {
    const factions = getJoinedFactions(ns)

    for (const faction of factions) {
        await levelFaction(ns, faction, focus)
    }
}

/**
 * Levels a faction to max or the required level to unlock donations if not unlocked
 * @param ns
 * @param faction faction to level
 * @param focus Whether to open the the faction work screen
 */
export async function levelFaction(ns: NS, faction: string, focus=false): Promise<void> {
    const highestRepAug = ns.getAugmentationsFromFaction(faction)
        .filter(a => !ns.getOwnedAugmentations(true).includes(a))
        .reduce((a,b) => ns.getAugmentationRepReq(a) > ns.getAugmentationRepReq(b) ? a : b)

    const repMax = ns.getAugmentationRepReq(highestRepAug)

    if(ns.getFactionFavor(faction) >= 150) {
        await donateToRep(ns, faction, repMax)
    }

    const job = ['Hacking Contracts', 'Field Work', 'Security Work']
        .filter(j => ns.workForFaction(faction, j, false))[0]

    while (ns.getFactionFavor(faction) + ns.getFactionFavorGain(faction) < 150 &&
        ns.getFactionFavorGain(faction) < 50 &&
        ns.getFactionRep(faction) < repMax) {
        ns.workForFaction(faction, job, focus)
        await ns.sleep(60000)
    }
}

/**
 * Attempts to donate to a faction to reach the target value, if not enough money,
 * works for faction in the background for 60 seconds
 * @param ns
 * @param faction faction to donate to
 * @param target target reputation to reach
 */
export async function donateToRep(ns: NS, faction: string, target: number): Promise<void> {
    const job = ['Hacking Contracts', 'Field Work', 'Security Work']
        .filter(j => ns.workForFaction(faction, j, false))[0]

    while(true) {
        const repToBuy = target - ns.getFactionRep(faction)
        if(repToBuy <= 0) return

        const repCost = 1e6 * repToBuy / ns.getPlayer().faction_rep_mult
        if(ns.getServerMoneyAvailable('home') >= repCost) {
            ns.donateToFaction(faction, repCost)
            return
        }
        ns.workForFaction(faction, job, false)
        await ns.sleep(60000)

    }
}

/**
 * Buys all available augments from most expensive to cheapest, then prompts for a reset
 * @param ns
 */
export async function augmentationReset(ns: NS): Promise<void> {
    let bestAugment = getMostExpensiveAugment(ns)
    while (bestAugment.cost != 0) {
        ns.purchaseAugmentation(bestAugment.factions[0], bestAugment.augment)
        await ns.sleep(0)
        bestAugment = getMostExpensiveAugment(ns)
    }

    const factions = getJoinedFactions(ns).sort((a,b) => ns.getFactionRep(b) - ns.getFactionRep(a))
    while(ns.purchaseAugmentation(factions[0], 'NeuroFlux Governor'));

    if(getJoinedFactions(ns).includes('Daedalus')) ns.purchaseAugmentation('The Red Pill')

    ns.installAugmentations('main.js')
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
        cost: 0,
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

export function getFactionsWithAugs(ns: NS): string[] {
    return getAllFactions().filter(f => factionHasAugs(ns, f))
}

export function getFactionRequirements(name: string): FactionRequirements {
    const factions = {
        'CyberSec': {
            backdoor: 'CSEC',
        } as FactionRequirements,
        'Tian Di Hui': {
            money: 1e6,
            hack_level:50,
            location: ['Chongqing', 'New Tokyo', 'Ishima'],
        } as FactionRequirements,
        'Netburners': {
            hack_level: 80,
            hacknet_level: 100,
            hacknet_ram: 8,
            hacknet_cores: 4,
        } as FactionRequirements,
        'Sector-12': {
            money: 15e6,
            location: ['Sector-12'],
            conflicts: ['Chongqing', 'New Tokyo', 'Ishima', 'Volhaven'],
        } as FactionRequirements,
        'Chongqing': {
            money: 20e6,
            location: ['Chongqing'],
            conflicts: ['Sector-12', 'Aevum', 'Volhaven'],
        } as FactionRequirements,
        'New Tokyo': {
            money: 20e6,
            location: ['New Tokyo'],
            conflicts: ['Sector-12', 'Aevum', 'Volhaven'],
        } as FactionRequirements,
        'Ishima': {
            money: 30e6,
            location: ['Ishima'],
            conflicts: ['Sector-12', 'Aevum', 'Volhaven'],
        } as FactionRequirements,
        'Aevum': {
            money: 40e6,
            location: ['Aevum'],
            conflicts: ['Chongqing', 'New Tokyo', 'Ishima', 'Volhaven'],
        } as FactionRequirements,
        'Volhaven': {
            money: 50e6,
            location: ['Volhaven'],
            conflicts: ['Sector-12', 'Aevum', 'Chongqing', 'New Tokyo', 'Ishima'],
        } as FactionRequirements,
        'NiteSec': {
            backdoor: 'avmnite-02h',
        } as FactionRequirements,
        'The Black Hand': {
            backdoor: 'I.I.I.I',
        } as FactionRequirements,
        'BitRunners': {
            backdoor: 'run4theh111z',
        } as FactionRequirements,
        'ECorp': {
            company: {
                name: 'ECorp',
                location: 'Aevum',
                rep: 200e3,
            },
        } as FactionRequirements,
        'MegaCorp': {
            company: {
                name: 'MegaCorp',
                location: 'Sector-12',
                rep: 200e3,
            },
        } as FactionRequirements,
        'KuaiGong International': {
            company: {
                name: 'KuaiGong International',
                location: 'Chongqing',
                rep: 200e3,
            },
        } as FactionRequirements,
        'Four Sigma': {
            company: {
                name: 'Four Sigma',
                location: 'Sector-12',
                rep: 200e3,
            },
        } as FactionRequirements,
        'NWO': {
            company: {
                name: 'NWO',
                location: 'Volhaven',
                rep: 200e3,
            },
        } as FactionRequirements,
        'Blade Industries': {
            company: {
                name: 'Blade Industries',
                location: 'Sector-12',
                rep: 200e3,
            },
        } as FactionRequirements,
        'OmniTek Incorporated': {
            company: {
                name: 'OmniTek Incorporated',
                location: 'Volhaven',
                rep: 200e3,
            },
        } as FactionRequirements,
        'Bachman & Associates': {
            company: {
                name: 'Bachman & Associates',
                location: 'Aevum',
                rep: 200e3,
            },
        } as FactionRequirements,
        'Clarke Incorporated': {
            company: {
                name: 'Clarke Incorporated',
                location: 'Aevum',
                rep: 200e3,
            },
        } as FactionRequirements,
        'Fulcrum Secret Technologies': {
            backdoor: 'fulcrumassets',
            company: {
                name: 'Fulcrum Technologies',
                location: 'Aevum',
                rep: 250e3,
            },
        } as FactionRequirements,
        'Slum Snakes': {
            combat_stats: 30,
            karma: -9,
            money: 1e6,
        } as FactionRequirements,
        'Tetrads': {
            location: ['Chongqing', 'New Tokyo', 'Ishima'],
            combat_stats: 75,
            karma: -18,
        } as FactionRequirements,
        'Silhouette': {
            ceo: true,
            money: 15e6,
            karma: -22,
        } as FactionRequirements,
        'Speakers for the Dead': {
            hack_level: 100,
            combat_stats: 300,
            kills: 30,
            karma: -45,
            company_conflicts: ['CIA', 'NSA'],
        } as FactionRequirements,
        'The Dark Army': {
            hack_level: 300,
            combat_stats: 300,
            location: ['Chongqing'],
            kills: 5,
            karma: -45,
            company_conflicts: ['CIA', 'NSA'],
        } as FactionRequirements,
        'The Syndicate': {
            hack_level: 200,
            combat_stats: 200,
            location: ['Aevum', 'Sector-12'],
            money: 10e6,
            karma: -90,
            company_conflicts: ['CIA', 'NSA'],
        } as FactionRequirements,
        'The Covenant': {
            augmentations: 20,
            money: 75e9,
            hack_level: 850,
            combat_stats: 850,
        } as FactionRequirements,
        'Daedalus': {
            augmentations: 30,
            money: 100e9,
            hack_level: 2500,
            combat_stats: 1500,
            hack_or_combat: true,
        } as FactionRequirements,
        'Illuminati': {
            augmentations: 30,
            money: 150e9,
            hack_level: 1500,
            combat_stats: 1200,
        } as FactionRequirements,
    } as Record<string, FactionRequirements>

    if(!Object.keys(factions).includes(name)) throw(`getFactionRequirements: Invalid faction name: '${name}'`)

    return factions[name]
}

export async function fulfillFactionRequirements(ns: karmaNS, faction: string): Promise<boolean> {
    const requirements = getFactionRequirements(faction)

    // Errors if trying to fulfill requirements of requested faction
    if(requirements.conflicts != undefined) {
        const conflicts = requirements.conflicts
        const hasConflicts = getJoinedFactions(ns)
            .map(f => conflicts.includes(f))
            .includes(true)

        if(hasConflicts) throw(`Can't fulfill requirements for ${faction}: already joined a conflicting faction`)
    }

    if(requirements.kills != undefined) {
        const crimePID = ns.run('/daemon/crime.js', 1, 'kills')
        while(requirements.kills > ns.getPlayer().numPeopleKilled) await ns.sleep(60000)
        ns.kill(crimePID)
    }

    if(requirements.karma != undefined) {
        const crimePID = ns.run('/daemon/crime.js', 1, 'karma')
        while(requirements.karma > ns.heart.break()) await ns.sleep(60000)
        ns.kill(crimePID)
    }

    if(requirements.company != undefined) {
        const hasNeuroreceptor = ns.getOwnedAugmentations().includes('Neuroreceptor Management Implant')
        while(ns.getCompanyRep(requirements.company.name) < requirements.company.rep) {
            ns.applyToCompany(requirements.company.name, 'IT')
            ns.workForCompany(requirements.company.name, !hasNeuroreceptor)
            await ns.sleep(10000)
        }
    }

    // Travels to the location of the faction
    if(requirements.location != undefined) {
        while(!ns.travelToCity(requirements.location[0])) await ns.sleep(60000)
    }

    // Waits for stuff that will fulfill themselves
    while(!ns.checkFactionInvitations().includes(faction)) await ns.sleep(60000)

    return true
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
        'Heist',
    ]
}

/**
 * @param ns
 * @param prop CrimeStats property to maximize
 * @returns crime with maximum property/second
 */
export function getBestCrime(ns: NS, prop: keyof CrimeStats): string {
    return getAllCrimes().reduce((a, b) => {
        const aStats = ns.getCrimeStats(a)
        const bStats = ns.getCrimeStats(b)

        const aRate = <number>aStats[prop] / aStats.time * ns.getCrimeChance(a)
        const bRate = <number>bStats[prop] / bStats.time * ns.getCrimeChance(b)

        return aRate > bRate ? a : b
    })
}

/**
 * @param ns
 * @returns true if ram or cores were upgraded, false otherwise
 */
export function upgradeHomeServer(ns: NS): boolean {
    if (ns.getUpgradeHomeRamCost() * 16 < ns.getUpgradeHomeCoresCost()) {
        return ns.upgradeHomeRam()
    } else {
        return ns.upgradeHomeCores()
    }
}

/**
 * Attempts to purchase all port openers using singularity
 * @param ns
 */
export function buyAll(ns: NS): void {
    if (!ns.serverExists('darkweb')) {
        ns.purchaseTor()
    } else {
        ['BruteSSH.exe', 'FTPCrack.exe', 'HTTPWorm.exe', 'SQLInject.exe', 'relaySMTP.exe']
            .filter(f => !ns.fileExists(f))
            .forEach(f => ns.purchaseProgram(f))
    }
}