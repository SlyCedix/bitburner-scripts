import { NS } from '@ns'
import { ServerPerformance } from '../../types'

export function deepScan(ns: NS): string[] {
    ns.disableLog('ALL')
    const hostnames = ['home']

    for (const hostname of hostnames) {
        hostnames.push(...ns.scan(hostname).filter(host => !hostnames.includes(host)))
    }

    return hostnames
}

export function rankServers(ns: NS): ServerPerformance[] {
    const servers = deepScan(ns).filter(x => ns.getHackingLevel() / 1.5 > ns.getServerRequiredHackingLevel(x))
        .filter(x => ns.getServer(x).hasAdminRights)
    if (servers.length == 0) servers.push('n00dles', 'foodnstuff')
    const data: ServerPerformance[] = []

    for (const target of servers) {
        const server = ns.getServer(target)
        const difficulty = server.minDifficulty
        const ht_mul = 2.5 * server.requiredHackingSkill * difficulty + 500
        const raw = server.moneyMax * server.serverGrowth
        data.push({ hostname: target, preformance: (raw / ht_mul / 1e7) })
    }

    data.sort((a, b) => b.preformance - a.preformance)

    return data
}

export function findBestServer(ns: NS): string {
    return rankServers(ns)[0].hostname
}

export function getNextHackingLevel(ns: NS): number {
    ns.disableLog('ALL')

    let hostnames = deepScan(ns)
    hostnames = hostnames.filter((hostname) =>
        (ns.getServerRequiredHackingLevel(hostname) > ns.getHackingLevel()))
    let lowest = Number.MAX_VALUE

    for (let i = 0; i < hostnames.length; ++i) {
        if (ns.getServerRequiredHackingLevel(hostnames[i]) < lowest) {
            lowest = ns.getServerRequiredHackingLevel(hostnames[i])
        }
    }

    return lowest
}

export function upgradeAllServers(ns: NS): boolean {
    ns.disableLog('ALL')

    const pservs: string[] = ns.getPurchasedServers().sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
    const maxServs = ns.getPurchasedServerLimit()
    if (pservs.length < maxServs) {
        for (let i = pservs.length; i < ns.getPurchasedServerLimit(); ++i) {
            if (!upgradeServer(ns, `pserv-${i}`)) break
        }
        return pservs.length < ns.getPurchasedServers().length
    }

    const currRam = ns.serverExists(pservs[0]) ? Math.log2(ns.getServerMaxRam(pservs[0])) : 0
    let upgradeCost = ns.getPurchasedServerCost(2 ** (currRam + 1)) * maxServs

    // Makes sure all servers are the same level before trying to batch upgrade
    let serversToUpgrade = pservs.filter(pserv => {
        return ns.getServerMaxRam(pserv) < ns.getServerMaxRam(pservs[0])
    })
    if (serversToUpgrade.length == 0) {
        serversToUpgrade = pservs
    } else {
        upgradeCost = ns.getPurchasedServerCost(2 ** currRam) * serversToUpgrade.length
    }

    if (upgradeCost < ns.getServerMoneyAvailable('home')) {
        const ramToBuy = serversToUpgrade.length == maxServs ? currRam + 1 : currRam
        for (const pserv of serversToUpgrade) {
            if (!upgradeServer(ns, pserv, ramToBuy)) {
                ns.toast(`Could not upgrade ${pserv} to ${formatRAM(ns, 2 ** ramToBuy)}`, 'error')
            }
        }
        ns.toast(`Upgraded servers to ${formatRAM(ns, 2 ** ramToBuy)}`)
        return true
    } else {
        return false
    }
}

export function upgradeServer(ns: NS, server: string, level = 6): boolean {
    if (level < 1 || level > 20 || ns.getPurchasedServerCost(2 ** level) > ns.getServerMoneyAvailable('home')) {
        return false
    }
    if (ns.serverExists(server)) {
        if (Math.log2(ns.getServerMaxRam(server)) >= level) {
            return false
        }
        ns.killall(server)
        ns.deleteServer(server)
    }

    ns.purchaseServer(server, 2 ** level)
    return true
}

let pServLevel = 6
export function buyServer(ns: NS): string | boolean {
    ns.disableLog('ALL')

    const pServs = ns.getPurchasedServers()
    const maxRam = Math.pow(2, pServLevel)

    const serverCost = ns.getPurchasedServerCost(maxRam)
    const moneyAvailable = ns.getServerMoneyAvailable('home')

    if (pServs.length < ns.getPurchasedServerLimit()) {
        if (serverCost < moneyAvailable) {
            const hostname = ns.purchaseServer('pserv-' + pServs.length, maxRam)
            ns.toast(`Purchased server ${hostname} with ${formatRAM(ns, maxRam)}`)
            return hostname
        }
    } else {
        const oldServs = pServs.filter((server) => {
            return ns.getServerMaxRam(server) < maxRam
        })

        if (oldServs.length > 0) {
            if (ns.getPurchasedServerCost(maxRam) < moneyAvailable) {
                ns.killall(pServs[0])
                ns.deleteServer(pServs[0])
                const hostname = ns.purchaseServer(pServs[0], maxRam)
                ns.toast(`Upgraded server ${hostname} to ${formatRAM(ns, maxRam)}`)
                return hostname
            }
        } else {
            pServLevel++
        }
    }

    return false
}

export async function scpAll(ns: NS, filename = 'home'): Promise<void> {
    ns.disableLog('ALL')

    const hostnames = deepScan(ns)

    for (let i = 0; i < hostnames.length; ++i) {
        await ns.scp(filename, 'home', hostnames[i])
    }
}

export function getPortFunctions(ns: NS): ((host: string) => void)[] {
    ns.disableLog('ALL')

    const portFunctions = []

    if (ns.fileExists('BruteSSH.exe')) portFunctions.push(ns.brutessh)
    if (ns.fileExists('FTPCrack.exe')) portFunctions.push(ns.ftpcrack)
    if (ns.fileExists('relaySMTP.exe')) portFunctions.push(ns.relaysmtp)
    if (ns.fileExists('HTTPWorm.exe')) portFunctions.push(ns.httpworm)
    if (ns.fileExists('SQLInject.exe')) portFunctions.push(ns.sqlinject)

    return portFunctions
}

export function rootAll(ns: NS): string[] {
    if (!ns.serverExists('darkweb')) {
        ns.purchaseTor()
    } else {
        if (!ns.fileExists('BruteSSH.exe')) ns.purchaseProgram('BruteSSH.exe')
        if (!ns.fileExists('FTPCrack.exe')) ns.purchaseProgram('FTPCrack.exe')
        if (!ns.fileExists('HTTPWorm.exe')) ns.purchaseProgram('HTTPWorm.exe')
        if (!ns.fileExists('SQLInject.exe')) ns.purchaseProgram('SQLInject.exe')
        if (!ns.fileExists('relaySMTP.exe')) ns.purchaseProgram('relaySMTP.exe')
    }

    const portFunctions = getPortFunctions(ns)

    // Gets all hostnames accessible on the network
    const hostnames = deepScan(ns)

    // Checks which hostnames can be rooted, but are not
    const needRoot = hostnames.filter((hostname) => {
        return !ns.hasRootAccess(hostname) &&
            (ns.getServerNumPortsRequired(hostname) <= portFunctions.length)
    })

    // Roots those servers
    needRoot.forEach((hostname) => {
        portFunctions.forEach((portFunction) => {
            portFunction(hostname)
        })
        ns.nuke(hostname)
    })

    return needRoot
}

export function getServersWithoutBackdoor(ns: NS): string[] {
    let hostnames = deepScan(ns)
    hostnames = hostnames.filter((hostname) => {
        return (!ns.getServer(hostname).backdoorInstalled &&
            ns.hasRootAccess(hostname) &&
            ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(hostname) &&
            !ns.getPurchasedServers().includes(hostname) &&
            hostname != 'home')
    })

    return hostnames
}

export function getServersWithContracts(ns: NS): string[] {
    let hostnames = deepScan(ns)
    hostnames = hostnames.filter((hostname) => {
        return ns.ls(hostname, '.cct').length > 0
    })

    return hostnames
}

export function findServer(ns: NS, target: string, start = 'home', source = ''): string[] {
    const hostnames = ns.scan(start).filter((hostname) => {
        return hostname != source
    })

    if (hostnames.includes(target)) {
        return [start, target]
    }

    for (let i = 0; i < hostnames.length; ++i) {
        const connection = findServer(ns, target, hostnames[i], start)

        if (connection.length > 0) {
            return [start, ...connection]
        }
    }

    return []
}

export function runTerminalCommand(command: string): void {
    const terminalInput = eval('document').getElementById('terminal-input')
    terminalInput.value = command
    const handler = Object.keys(terminalInput)[1]
    terminalInput[handler].onChange({
        target: terminalInput
    })
    terminalInput[handler].onKeyDown({
        keyCode: 13,
        preventDefault: () => null
    })
}

export function formatRAM(ns: NS, n: number): string {
    return ns.nFormat(n * 1024 ** 3, '0.00ib')
}

export function formatMoney(ns: NS, n: number): string {
    return ns.nFormat(n, '$0.00a')
}

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

export function connectToServer(ns: NS, target: string): boolean {
    if (!ns.serverExists(target)) return false

    const path = findServer(ns, target, ns.getCurrentServer())
    for (const node of path) {
        ns.connect(node)
    }
    return true
}

export function getAllFactions(): string[] {
    const factions = [
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

    return factions
}

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