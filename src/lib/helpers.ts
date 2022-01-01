import { NS } from '../../NetscriptDefinitions'
import { ServerPerformance } from '/../types.js'

export function deepScan(ns: NS): string[] {
    ns.disableLog('ALL')
    const hostnames = ['home']

    for (const hostname of hostnames) {
        hostnames.push(...ns.scan(hostname).filter(host => !hostnames.includes(host)))
    }

    return hostnames
}

export function rankServers(ns: NS): ServerPerformance[] {
    const servers = deepScan(ns).filter(x=>ns.getHackingLevel()/1.5 > ns.getServerRequiredHackingLevel(x))
        .filter(x=>ns.getServer(x).hasAdminRights)
    if(servers.length == 0) servers.push('n00dles', 'foodnstuff')
    const data : ServerPerformance[] = []
    
    for (const target of servers) {
        const server = ns.getServer(target)
        const difficulty = server.minDifficulty
        const ht_mul = 2.5 * server.requiredHackingSkill * difficulty + 500
        const raw = server.moneyMax * server.serverGrowth
        data.push({hostname: target, preformance: (raw / ht_mul / 1e7)})
    }

    data.sort((a,b)=>b.preformance - a.preformance)

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
    
    const pservs : string[] = ns.getPurchasedServers()
    if(pservs.length == 0) {
        for(let i = 0; i < ns.getPurchasedServerLimit(); ++i) {
            pservs.push(`pserv-${i}`)
        }
    }

    const currRam = ns.serverExists(pservs[0]) ? Math.log2(ns.getServerMaxRam(pservs[0])) : 0

    const costPerGig = 55000 * ns.getPurchasedServerLimit()
    const maxBuyableRam = Math.min(20, Math.floor(Math.log2(ns.getServerMoneyAvailable('home') / costPerGig)))

    if(maxBuyableRam < 6) return false

    if(maxBuyableRam > currRam) {
        for(const pserv of pservs) {
            if(ns.serverExists(pserv)) {
                ns.killall(pserv)
                ns.deleteServer(pserv)
            }
            ns.purchaseServer(pserv, 2**maxBuyableRam)
        }
        ns.toast(`Upgraded servers to ${formatRAM(ns, 2**maxBuyableRam * 1024**3)}`)
        return true
    } else {
        return false
    }
}

let pServLevel = 3
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
            if (ns.getPurchasedServerCost(maxRam) < moneyAvailable * 0.1) {
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

export function getPortFunctions(ns: NS): Array<any> {
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
    return ns.nFormat(n * 1024**3, '0.00ib')
}

export function formatMoney(ns : NS, n: number): string {
    return ns.nFormat(n, '$0.00a')
}

export async function backdoorAll(ns: NS): Promise<number> {
    const servers = getServersWithoutBackdoor(ns)
    let count = 0

    for(const server of servers) {
        const path = findServer(ns, server, ns.getCurrentServer())
        for(const node of path) {
            ns.connect(node)
        }
        await ns.installBackdoor()
        ++count
    }

    return count
}

export function connectToServer(ns: NS, target: string): boolean {
    if(!ns.serverExists(target)) return false

    const path = findServer(ns, target, ns.getCurrentServer())
    for(const node of path) {
        ns.connect(node)
    }
    return true
}