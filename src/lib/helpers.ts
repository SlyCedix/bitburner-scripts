import { NS } from '@ns'

/**
 * @param ns
 * @returns Array of all hostnames
 */
export function deepScan(ns: NS): string[] {
    ns.disableLog('ALL')
    const hostnames = ['home']

    for (const hostname of hostnames) {
        hostnames.push(...ns.scan(hostname).filter(host => !hostnames.includes(host)))
    }

    return hostnames
}

/**
 * @param ns
 * @returns Array of all hostnames sorted by performance
 */
export function rankServers(ns: NS): string[] {
    const getPerformance = (hostname: string): number => {
        const server = ns.getServer(hostname)
        const difficulty = server.minDifficulty
        const ht_mul = 2.5 * server.requiredHackingSkill * difficulty + 500
        const raw = server.moneyMax * server.serverGrowth
        return raw / ht_mul / 1e7
    }

    const servers = deepScan(ns)
        .filter(x => ns.getHackingLevel() / 1.5 > ns.getServerRequiredHackingLevel(x))
        .filter(x => ns.getServer(x).hasAdminRights)
        .filter(x => ns.getServerMaxMoney(x) != 0)

    if (servers.length < 2) return ['n00dles']
    return servers.sort((a, b) => getPerformance(b) - getPerformance(a))


}

/**
 * @param ns
 * @returns Hostname of highest performing server
 */
export function findBestServer(ns: NS): string {
    return rankServers(ns)[0]
}

/**
 * @param ns
 * @returns Lowest hacking level of a locked server
 */
export function getNextHackingLevel(ns: NS): number {
    const hostnames = deepScan(ns).filter((hostname) =>
        (ns.getServerRequiredHackingLevel(hostname) > ns.getHackingLevel()))
        .sort((a, b) => ns.getServerRequiredHackingLevel(b) - ns.getServerRequiredHackingLevel(a))

    return ns.getServerRequiredHackingLevel(hostnames[0])
}

/**
 * Purchases 64GB servers until server limit is reached
 *
 * Attempts to upgrade all servers at once otherwise
 * @param ns
 * @returns true if a server was purchased, false otherwise
 */
export function upgradeAllServers(ns: NS): boolean {
    const pservs: string[] = ns.getPurchasedServers()
        .sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
    const maxServs = ns.getPurchasedServerLimit()

    // Get to server cap before upgrading
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

/**
 * Upgrades a server to level if higher than the current level
 *
 * Buys a new server at level if the server does not exist
 * @param ns
 * @param server hostname of the server to upgrade or purchase
 * @param level level to upgrade to
 * @returns
 */
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

/**
 * Copies file from home to every server on the network
 * @param ns
 * @param files Filename or array of filenames to scp
 */
export async function scpAll(ns: NS, files: string | string[]): Promise<void> {
    const hostnames = deepScan(ns)

    for (const hostname of hostnames) {
        await ns.scp(files, 'home', hostname)
    }
}

/**
 * @param ns
 * @returns Array of port functions that the player currently can access
 */
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

/**
 * Attempts to purchase all port openers using singularity
 * @param ns
 */
export function buyAll(ns: NS): void {
    if (!ns.serverExists('darkweb')) {
        ns.purchaseTor()
    } else {
        if (!ns.fileExists('BruteSSH.exe')) ns.purchaseProgram('BruteSSH.exe')
        if (!ns.fileExists('FTPCrack.exe')) ns.purchaseProgram('FTPCrack.exe')
        if (!ns.fileExists('HTTPWorm.exe')) ns.purchaseProgram('HTTPWorm.exe')
        if (!ns.fileExists('SQLInject.exe')) ns.purchaseProgram('SQLInject.exe')
        if (!ns.fileExists('relaySMTP.exe')) ns.purchaseProgram('relaySMTP.exe')
    }
}

/**
 * @param ns
 * @returns Array of hostnames that have been rooted
 */
export function rootAll(ns: NS): string[] {
    buyAll(ns)
    const portFunctions = getPortFunctions(ns)

    // Checks which hostnames can be rooted, but are not
    const needRoot = deepScan(ns).filter((hostname) => {
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

/**
 * @param ns
 * @returns Array of hostnames that have not been backdoored
 */
export function getServersWithoutBackdoor(ns: NS): string[] {
    return deepScan(ns)
        .filter((hostname) => {
            return (!ns.getServer(hostname).backdoorInstalled &&
                ns.hasRootAccess(hostname) &&
                ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(hostname) &&
                !ns.getPurchasedServers().includes(hostname) &&
                hostname != 'home')
        })
}

/**
 * @param ns
 * @returns List of servers with contract files
 */
export function getServersWithContracts(ns: NS): string[] {
    return deepScan(ns).filter((hostname) => {
        return ns.ls(hostname, '.cct').length > 0
    })
}


/**
 * @param ns
 * @param target Hostname to connect to
 * @param start Optional - Hostname to connect from (defaults to home)
 * @returns connection path from start to target as array of hostnames
 */
export function findServer(ns: NS, target: string, start = 'home', source = ''): string[] {
    const hostnames = ns.scan(start).filter((hostname) => {
        return hostname != source
    })

    if (hostnames.includes(target)) {
        return [start, target]
    }

    for (const hostname of hostnames) {
        const connection = findServer(ns, target, hostname, start)

        if (connection.length > 0) {
            return [start, ...connection]
        }
    }

    return []
}

/**
 * Kills all scripts on every server
 * @param ns
 */
export function killAll(ns: NS): void {
    deepScan(ns)
        .filter(server => server != ns.getHostname())
        .forEach(ns.killall)
    ns.killall(ns.getHostname())
}

/**
 * @param ns
 * @param n Ram in GB to format
 * @returns Formatted ram string in iB
 */
export function formatRAM(ns: NS, n: number): string {
    return ns.nFormat(n * 1024 ** 3, '0.00ib')
}

/**
 * @param ns
 * @param n Amount of money to format
 * @returns Formatted money string
 */
export function formatMoney(ns: NS, n: number): string {
    return ns.nFormat(n, '$0.00a')
}

/**
 * @param ns
 * @returns Total ram of all rooted servers
 */
export function getNetworkRam(ns: NS): number {
    return deepScan(ns)
        .map(s => ns.getServer(s))
        .filter(s => s.hasAdminRights)
        .map(s => s.maxRam - s.ramUsed)
        .reduce((a, b) => a + b)
}

/**
 * Executes a script on the server with the most ram available
 * @param ns
 * @param script Script to be executed
 * @param threads Thread count to run the script with
 * @param args Arguments to pass to the script
 * @returns true if the script was executed, false otherwise
 */
export function deploy(ns: NS, script: string, threads: number, ...args: (string | boolean | number)[]): boolean {
    const reqRam = ns.getScriptRam(script) * threads
    const server = deepScan(ns)
        .filter(s => getServerFreeRam(ns, s) >= reqRam)
        .reduce((a, b) => getServerFreeRam(ns, b) > getServerFreeRam(ns, a) ? b : a)

    if (!server) return false

    ns.exec(script, server, threads, ...args)
    return true
}

/**
 * @param ns
 * @param server hostname to check the ram of
 * @returns Available ram on a server
 */
export function getServerFreeRam(ns: NS, server: string): number {
    return ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
}
