import { key } from 'OAuth.js'
import { NS } from '../../NetscriptDefinitions'


export function deepScan(ns: NS): string[] {
    ns.disableLog('ALL')
    const hostnames = ['home']

    for (const hostname of hostnames) {
        hostnames.push(...ns.scan(hostname).filter(host => !hostnames.includes(host)))
    }

    return hostnames
}

export function findBestServer(ns: NS): string {
    ns.disableLog('ALL')

    let hostnames = deepScan(ns)
    hostnames = hostnames.filter((hostname) => {
        return ns.hasRootAccess(hostname) && ns.getServerRequiredHackingLevel(hostname) <= ns.getHackingLevel()
    })

    hostnames.sort((a, b) => {
        return getHackProduction(ns, b) - getHackProduction(ns, a)
    })

    return hostnames[0]
}

function getHackProduction(ns: NS, hostname: string): number {
    const hackProduction = ns.getServerMaxMoney(hostname) * ns.getServerGrowth(hostname)

    return hackProduction
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
    if (n < 1e3) return ns.nFormat(n, '0.00') + 'GB'
    if (n < 1e6) return ns.nFormat(n / 1e3, '0.00') + 'TB'
    if (n < 1e9) return ns.nFormat(n / 1e6, '0.00') + 'PB'
    if (n < 1e12) return ns.nFormat(n / 1e9, '0.00') + 'EB'
    return ns.nFormat(n, '0.00') + 'GB'
}

export async function getText(url: string): Promise<string | void> {
    const fetchHeaders = [
        ['Authorization', `token ${key}`],
        ['Content-Type', 'text/plain']
    ]

    return fetch(url, {
        method: 'GET',
        headers: fetchHeaders
    }).then(response => {
        if (response.status === 200) {
            return response.text()
        } else {
            return ''
        }
    }).catch(() => { return })
}

export async function getJSON<T>(url: string): Promise<T> {
    const fetchHeaders = [
        ['Authorization', `token ${key}`],
        ['Content-Type', 'application/json']
    ]

    return fetch(url, {
        method: 'GET',
        headers: fetchHeaders
    }).then(response => {
        if (response.status === 200) {
            return response.json() as Promise<T>
        } else {
            return
        }
    }).catch(() => { return }) as Promise<T>
}

export function fixImports(script: string): string {
    return script.replaceAll(/from ['"]((\.*)\/)*/g, 'from \'/').replaceAll(/from ['"](.*(\w)*)['"]/g, 'from \'$1.js\'')
}