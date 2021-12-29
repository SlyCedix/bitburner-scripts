import { NS, Server } from '../NetscriptDefinitions'
import { ActionTimes, HackRatios } from '../types'
import { HackingFormulas } from './lib/formulas'
import { buyServer, deepScan, findBestServer, getPortFunctions, rootAll } from '/lib/helpers.js'


export async function main(ns : NS) : Promise<void> {
    const botnet = new Botnet(ns)

    while(true) {
        await botnet.update() 
        await ns.sleep(10)
    }
}

const prepped: any = {}

const hackScript = '/hwgw/hack.js'
const growScript = '/hwgw/grow.js'
const weakScript = '/hwgw/weaken.js'

const HackSecurityEffect = 0.002
const WeakSecurityEffect = 0.05
const GrowSecurityEffect = 0.004
export class Bot {
    readonly ns: NS
    readonly leveling: boolean
    readonly buffer: number
    readonly server: string

    readonly growRam: number
    readonly hackRam: number
    readonly weakRam: number

    target: string

    private _uuid = 0
    private _prevBatch = 0

    constructor(ns: NS, server: string, target: string, leveling = false, buffer = 8) {
        ns.disableLog('ALL')

        this.ns = ns
        this.buffer = buffer
        this.server = server

        if (ns.getServerMaxMoney(server) > 0) {
            this.target = server
            this.leveling = false
        } else {
            this.target = target
            this.leveling = leveling
        }

        this.hackRam = ns.getScriptRam(hackScript)
        this.growRam = ns.getScriptRam(growScript)
        this.weakRam = ns.getScriptRam(weakScript)
    }

    async init(): Promise<void> {
        const files = [hackScript, growScript, weakScript]

        await this.ns.scp(files, this.ns.getHostname(), this.server)

        this.ns.print(`INFO: Bot initialized on ${this.server} attacking ${this.target}`)
    }

    async update(): Promise<void> {
        const ps = this.ns.ps(this.server).filter((p) => {
            return p.filename == weakScript
        })
        if(ps.length == 0) {
            const ratios = this.ratios  // get const version because this isn't a cheap getter and it shouldn't change at exec time (probably)
            const timeB = 15
            
            if (ratios.weakT + ratios.growT + ratios.weak2T + ratios.hackT > 0 ) {
                const totalRam = (ratios.weakT + ratios.weak2T) * this.weakRam + ratios.growT * this.growRam + ratios.hackT * this.hackRam
                while(this.ns.getServer(this.server).maxRam - this.ns.getServer(this.server).ramUsed >= totalRam) {
                    if (ratios.hackT > 0) this.ns.exec(hackScript, this.server, ratios.hackT, this.target, this.times.weaken - this.times.hack, this.uuid)
                    await this.ns.sleep(timeB)
                    if (ratios.weakT > 0) this.ns.exec(weakScript, this.server, ratios.weakT, this.target, 0, this.uuid)
                    await this.ns.sleep(timeB)
                    if (ratios.growT > 0) this.ns.exec(growScript, this.server, ratios.growT, this.target, this.times.weaken - this.times.grow, this.uuid)
                    await this.ns.sleep(timeB)
                    if (ratios.weak2T > 0) this.ns.exec(weakScript, this.server, ratios.weak2T, this.target, 0, this.uuid)
                    await this.ns.sleep(timeB)
                }
            }
        }
    }


    simulateHack(serverData: Server, maxThreads: number, take = 1): [number, Server] {
        const hackAmount = HackingFormulas.hackPercent(serverData, this.ns.getPlayer())
        const hackT = Math.floor(take / hackAmount)
        if (hackT > maxThreads) {
            return [-1, serverData]
        } else {
            serverData.moneyAvailable -= take * serverData.moneyMax
            if(serverData.moneyAvailable <= 0) serverData.moneyAvailable = 0
            serverData.hackDifficulty += hackT * HackSecurityEffect
            return [hackT, serverData]
        }
    }

    simulateWeaken(serverData: Server, maxThreads: number): [number, Server]  {
        const weakT = Math.ceil((serverData.hackDifficulty - serverData.minDifficulty) / WeakSecurityEffect)
        if (weakT > maxThreads) {
            return [-1, serverData]
        } else {
            serverData.hackDifficulty = serverData.minDifficulty
            return [weakT, serverData]
        }
    }

    simulateGrowth(serverData: Server, maxThreads: number): [number, Server]  {
        if (serverData.moneyAvailable <= 0) serverData.moneyAvailable = 1
        if (maxThreads == Infinity) maxThreads = Math.floor(2**30 / this.growRam)
        else if((serverData.moneyMax / serverData.moneyAvailable) > 
            HackingFormulas.growPercent(serverData, maxThreads, this.ns.getPlayer(),
                                        this.ns.getServer(this.server).cpuCores)) return [-1, serverData]

        let growT = 0
        
        let step = Math.floor(maxThreads / 100)
        if (step <= 0) step = 1

        const newServer = JSON.parse(JSON.stringify(serverData))
        while (growT < maxThreads) {
            growT += step
            newServer.moneyAvailable += step
            newServer.hackDifficulty += step * GrowSecurityEffect
            newServer.moneyAvailable *= HackingFormulas.growPercent(newServer, step, this.ns.getPlayer(),
                this.ns.getServer(this.server).cpuCores)
            if (newServer.moneyAvailable >= newServer.moneyMax) {
                newServer.moneyAvailable = newServer.moneyMax
                return [growT, newServer]
            }
        }

        return [-1, serverData]
    }

    get ratios(): HackRatios {
        let hackRatios = {
            hackT: 0,
            weakT: 0,
            growT: 0,
            weak2T: 0
        }

        let serverData = this.ns.getServer(this.target)
        const freeRam = this.ns.getServerMaxRam(this.server) - this.ns.getServerUsedRam(this.server) - this.buffer

        // Adjustments for when server is not at best values
        if (serverData.moneyAvailable == 0) serverData.moneyAvailable = 1
        if ((serverData.minDifficulty != serverData.hackDifficulty ||
            serverData.moneyAvailable != serverData.moneyMax) &&
            !prepped[this.target]) {
                
            console.debug(`Prepping: ${this.target}`)
            prepped[this.target] = true

            let sim = this.simulateWeaken(serverData, Infinity)
            hackRatios.weakT = sim[0]
            serverData = sim[1]
            let totalRam = hackRatios.weakT * this.weakRam

            sim = this.simulateGrowth(serverData, Infinity)
            hackRatios.growT = sim[0]
            serverData = sim[1]
            totalRam += hackRatios.growT * this.growRam

            sim = this.simulateWeaken(serverData, Infinity)
            hackRatios.weak2T = sim[0]
            serverData = sim[1]
            totalRam += hackRatios.weak2T * this.weakRam

            if (totalRam > freeRam) {
                prepped[this.target] = false
                const ramFactor = freeRam / totalRam
                console.debug(ramFactor)
                hackRatios.weakT = Math.floor(hackRatios.weakT * ramFactor)
                hackRatios.growT = Math.floor(hackRatios.growT * ramFactor)
                hackRatios.weak2T = Math.floor(hackRatios.weak2T * ramFactor)
            }

            return hackRatios
        }

        serverData.moneyAvailable = serverData.moneyMax
        serverData.hackDifficulty = serverData.minDifficulty

        const hackAmount = HackingFormulas.hackPercent(serverData, this.ns.getPlayer())
        const maxMoneyPerHack = Math.min(Math.floor(freeRam / this.hackRam) * hackAmount, 1)
        const increment = maxMoneyPerHack / 50

        // Calculate thread ratios
        for (let i = maxMoneyPerHack; i > 0; i -= increment) {
            hackRatios = {
                hackT: 0,
                weakT: 0,
                growT: 0,
                weak2T: 0
            }

            serverData.moneyAvailable = serverData.moneyMax
            serverData.hackDifficulty = serverData.minDifficulty

            // Hack
            let maxT = Math.floor(freeRam / this.hackRam)
            let sim = this.simulateHack(serverData, maxT, i)
            hackRatios.hackT = sim[0]
            serverData = sim[1]
            
            if (hackRatios.hackT == -1) continue
            if (hackRatios.hackT == 0) break
            let totalRam = hackRatios.hackT * this.hackRam

            // First Weaken
            maxT = Math.floor((freeRam - totalRam) / this.hackRam)
            sim = this.simulateWeaken(serverData, maxT)
            hackRatios.weakT = sim[0]
            serverData = sim[1]
           
            if (hackRatios.weakT == -1) continue
            totalRam += hackRatios.weakT * this.weakRam

            //Grow
            maxT = Math.floor((freeRam - totalRam) / this.hackRam)
            sim = this.simulateGrowth(serverData, maxT)
            hackRatios.growT = sim[0]
            serverData = sim[1]
            
            if (hackRatios.growT == -1) continue
            totalRam += hackRatios.growT * this.growRam

            // Second weaken
            maxT = Math.floor((freeRam - totalRam) / this.hackRam)
            sim = this.simulateWeaken(serverData, maxT)
            hackRatios.weak2T = sim[0]
            serverData = sim[1]

            if (hackRatios.weak2T == -1) continue

            return hackRatios
        }

        return {
            hackT: 0,
            weakT: 0,
            growT: 0,
            weak2T: 0
        }
    }

    get times(): ActionTimes {
        return {
            grow: this.ns.getGrowTime(this.target),
            hack: this.ns.getHackTime(this.target),
            weaken: this.ns.getWeakenTime(this.target)
        }
    }

    get uuid(): number {
        return this._uuid++
    }
}

export class Botnet {
    ns: NS
    leveling: boolean

    portFunctions: Array<any> = []

    target = ''
    servers: Array<string> = []

    bots: Array<Bot> = []

    constructor(ns: NS, leveling = false) {
        this.ns = ns
        this.leveling = leveling
    }

    async init(): Promise<void> {
        this.ns.disableLog('ALL')

        this.portFunctions = getPortFunctions(this.ns)
        rootAll(this.ns)

        this.target = this.leveling ? 'joesguns' : findBestServer(this.ns)

        this.servers = (deepScan(this.ns)).filter((hostname) => {
            return this.ns.hasRootAccess(hostname)
        })

        this.bots = []

        for (const server of this.servers) {
            let buffer = 16
            if (server != 'home') {
                this.ns.killall(server)
                buffer = 0
            }
            const bot = new Bot(this.ns, server, this.target, this.leveling, buffer)
            this.bots.push(bot)
            await bot.init()
            await this.ns.sleep(10)
        }

        this.ns.print(`INFO: Botnet initialized (attacking ${this.target})`)

        this.initUI()
    }

    async update(): Promise<void> {
        const newPortFunctions = getPortFunctions(this.ns)

        if (newPortFunctions.length > this.portFunctions.length) {
            this.portFunctions = newPortFunctions
            const newServs = rootAll(this.ns)

            for (const server of newServs) {
                const bot = new Bot(this.ns, server, this.target, this.leveling)
                this.bots.push(bot)
                await bot.init()
            }
        }

        if (!this.leveling) {
            const newBest = findBestServer(this.ns)
            if (newBest != this.target) {
                this.target = newBest
                for (const bot of this.bots) {
                    bot.target = newBest
                }
            }
        }

        const boughtServer = buyServer(this.ns)


        if (boughtServer) {
            this.bots = this.bots.filter((bot: Bot) => {
                return bot.server != boughtServer
            })
            const bot = new Bot(this.ns, boughtServer as string, this.target, this.leveling, 0)
            this.bots.push(bot)
            await bot.init()
        }

        for (const bot of this.bots) {
            await bot.update()
        }

        this.updateUI()
    }

    initUI(): void {
        this.createDisplay('Security')
        this.createDisplay('Money')
        this.createDisplay('Target')
    }

    updateUI(): void {
        const moneyAvailable = this.ns.getServerMoneyAvailable(this.target)

        const securityLevel = this.ns.getServerSecurityLevel(this.target)

        const doc = eval('document')

        doc.getElementById('Target-hook-1').innerHTML = this.target
        doc.getElementById('Money-hook-1').innerHTML = this.ns.nFormat(moneyAvailable, '$0.0a')
        doc.getElementById('Security-hook-1').innerHTML = this.ns.nFormat(securityLevel, '0.0')
    }

    createDisplay(name: string): void {
        const doc = eval('document')
        const display = doc.getElementById(name + '-hook-0')

        if (typeof (display) == 'undefined' || display == null) {
            const extraHookRow = doc.getElementById('overview-extra-hook-0').parentElement.parentElement
            const clonedRow = extraHookRow.cloneNode(true)

            clonedRow.childNodes[0].childNodes[0].id = name + '-hook-0'
            clonedRow.childNodes[0].childNodes[0].innerHTML = name
            clonedRow.childNodes[1].childNodes[0].id = name + '-hook-1'
            clonedRow.childNodes[2].childNodes[0].id = name + '-hook-2'

            extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling)
        }
    }
}