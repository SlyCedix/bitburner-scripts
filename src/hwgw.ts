import { NS, Server } from '../NetscriptDefinitions'
import { ActionTimes, HackRatios, ServerPerformance } from '../types'
import { HackingFormulas } from './lib/formulas'
import { deepScan, rankServers, rootAll, upgradeAllServers } from '/lib/helpers.js'

let hooks : Array<Node> = []

export async function main(ns : NS) : Promise<void> {
    const botnet = new Botnet(ns)
    await botnet.init()

    ns.atExit(() => { 
        console.debug(hooks)
        for(const hook of hooks) {
            // @ts-ignore
            hook.parentElement.removeChild(hook)
        }
        hooks = []
    })

    while(true) {
        await botnet.update() 
        await ns.sleep(0)
    }
}

const hackScript = '/hwgw/hack.js'
const growScript = '/hwgw/grow.js'
const weakScript = '/hwgw/weaken.js'

const HackSecurityEffect = 0.002
const WeakSecurityEffect = 0.05
const GrowSecurityEffect = 0.004
export class Bot {
    readonly ns: NS
    readonly buffer: number
    readonly server: string

    readonly growRam: number
    readonly hackRam: number
    readonly weakRam: number

    target: string

    private _uuid = 0
    private _prevBatch = 0

    constructor(ns: NS, server: string, target: string, buffer = 0) {
        ns.disableLog('ALL')

        this.ns = ns
        this.buffer = buffer
        this.server = server

        this.target = ns.getServerMaxMoney(server) > 0 ? server : target

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
            const ratios = await this.getRatios()  // get const version because this isn't a cheap getter and it shouldn't change at exec time (probably)
            const times = this.times // this one can change at runtime and it breaks things if it does
            const timeB = 500

            let delay = 0
            
            let target = this.target
            if(this.target == this.server) {
                const targetServer = this.ns.getServer(target)
                if(!(targetServer.hasAdminRights && this.ns.getServerRequiredHackingLevel(target) <= this.ns.getHackingLevel())) {
                    target = 'n00dles'
                }
            }

            if(ratios.hackT > 0) {
                const totalRam = (ratios.weakT + ratios.weak2T) * this.weakRam + ratios.growT * this.growRam + ratios.hackT * this.hackRam
                const numBatches = Math.floor(this.freeRam / totalRam)
                // const startTime = Date.now()
                const endTime = Date.now() + (times.weaken - times.hack) - timeB * 4

                console.debug(numBatches)
                for(let i = 0; i < numBatches; ++i) {
                    
                    this.ns.exec(hackScript, this.server, ratios.hackT, target, Math.floor(times.weaken - times.hack + delay), this.uuid)
                    delay += timeB
                    this.ns.exec(weakScript, this.server, ratios.weakT, target, Math.floor(delay), this.uuid)
                    delay += timeB
                    this.ns.exec(growScript, this.server, ratios.growT, target, Math.floor(times.weaken - times.grow + delay), this.uuid)
                    delay += timeB
                    this.ns.exec(weakScript, this.server, ratios.weak2T, target, Math.floor(delay), this.uuid)
                    
                    // await this.ns.sleep(0)
                    console.debug(endTime - Date.now() - delay)
                    delay += timeB
                    if(Date.now() + delay > endTime) break
                }
            } else {
                if (ratios.weakT > 0) this.ns.exec(weakScript, this.server, ratios.weakT, target, Math.floor(delay), this.uuid)
                delay += timeB
                if (ratios.growT > 0) this.ns.exec(growScript, this.server, ratios.growT, target, Math.floor(times.weaken - times.grow + delay), this.uuid)
                delay += timeB
                if (ratios.weak2T > 0) this.ns.exec(weakScript, this.server, ratios.weak2T, target, Math.floor(delay), this.uuid)
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

    async simulateGrowth(serverData: Server, maxThreads: number): Promise<[number, Server]>  {
        if (serverData.moneyAvailable <= 0) serverData.moneyAvailable = 1
        if (maxThreads == Infinity) maxThreads = Math.floor(2**30 / this.growRam)
        else if((serverData.moneyMax / serverData.moneyAvailable) > 
            HackingFormulas.growPercent(serverData, maxThreads, this.ns.getPlayer(),
                                        this.ns.getServer(this.server).cpuCores)) return [-1, serverData]

        let growT = 0
        
        const step = 10

        const newServer = JSON.parse(JSON.stringify(serverData))
        while (growT < maxThreads) {
            await this.ns.sleep(0)
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

    async getRatios(): Promise<HackRatios> {
        let hackRatios = {
            hackT: 0,
            weakT: 0,
            growT: 0,
            weak2T: 0
        }

        let serverData = this.ns.getServer(this.target)
        
        const freeRam = this.freeRam
        
        // Adjustments for when server is not at best values
        if (serverData.moneyAvailable == 0) serverData.moneyAvailable = 1
        if ((serverData.minDifficulty != serverData.hackDifficulty ||
            serverData.moneyAvailable != serverData.moneyMax)) {
            let sim = this.simulateWeaken(serverData, Infinity)
            hackRatios.weakT = Math.max(sim[0], 0)
            serverData = sim[1]
            let totalRam = hackRatios.weakT * this.weakRam
            
            const maxT = Math.ceil((freeRam - totalRam) / this.weakRam)
            sim = await this.simulateGrowth(serverData, maxT)
            hackRatios.growT = Math.max(sim[0], 0)
            serverData = sim[1]
            totalRam += hackRatios.growT * this.growRam

            sim = this.simulateWeaken(serverData, Infinity)
            hackRatios.weak2T = Math.max(sim[0], 0)
            serverData = sim[1]
            totalRam += hackRatios.weak2T * this.weakRam

            if (totalRam > freeRam) {
                const ramFactor = freeRam / totalRam
                hackRatios.weakT = Math.floor(hackRatios.weakT * ramFactor)
                hackRatios.growT = Math.floor(hackRatios.growT * ramFactor)
                hackRatios.weak2T = Math.floor(hackRatios.weak2T * ramFactor)
            }

            return hackRatios
        }

        serverData.moneyAvailable = serverData.moneyMax
        serverData.hackDifficulty = serverData.minDifficulty

        const hackAmount = HackingFormulas.hackPercent(serverData, this.ns.getPlayer())
        const maxMoneyPerHack = Math.min(Math.floor(freeRam / this.hackRam) * hackAmount, .8)
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
            sim = await this.simulateGrowth(serverData, maxT)
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
        const server = this.ns.getServer(this.target)
        const player = this.ns.getPlayer()

        return {
            grow: HackingFormulas.growTime(server, player),
            hack: HackingFormulas.hackTime(server, player),
            weaken: HackingFormulas.weakenTime(server, player),
        }
    }

    get uuid(): number {
        return this._uuid++
    }

    get freeRam(): number {
        return this.ns.getServerMaxRam(this.server) - this.ns.getServerUsedRam(this.server) - this.buffer
    }
}

export class Botnet {
    ns: NS

    targets: Array<ServerPerformance> = []
    servers: Array<string> = []

    bots: Array<Bot> = []

    constructor(ns: NS) {
        this.ns = ns
    }

    async init(): Promise<void> {
        this.ns.disableLog('ALL')

        rootAll(this.ns)

        this.targets = rankServers(this.ns)

        this.servers = (deepScan(this.ns)).filter((hostname) => {
            return this.ns.hasRootAccess(hostname)
        })

        this.bots = []

        let n = 0

        for (const server of this.servers) {
            let buffer = 16
            if (server != 'home') {
                this.ns.killall(server)
                buffer = 0
            }
            let target = 'n00dles'
            if(this.ns.getPurchasedServers().includes(server) || server == 'home') {
                target = this.targets[n++].hostname
            } 
            const bot = new Bot(this.ns, server, target, buffer)
            this.bots.push(bot)
            await bot.init()
        }

        this.ns.print('INFO: Botnet initialized')

        this.initUI()
    }

    async update(): Promise<void> {
        const newServs = rootAll(this.ns)

        if (newServs.length > 0) {
            const newServs = rootAll(this.ns)
            for (const server of newServs) {
                const bot = new Bot(this.ns, server, 'n00dles')
                this.bots.push(bot)
                await bot.init()
            }
        }

        if(upgradeAllServers(this.ns)) {
            this.bots = this.bots.filter( bot => !this.ns.getPurchasedServers().includes(bot.server))
            let n = 0
            for(const server of this.ns.getPurchasedServers()) {
                const bot = new Bot(this.ns, server, this.targets[n++].hostname)
                this.bots.push(bot)
                await bot.init()
            }
        }

        for(const bot of this.bots) {
            this.updateUI()
            await bot.update()
        }        
    }

    initUI(): void {
        this.createDisplay('Exp')
        this.createDisplay('Money')
    }

    updateUI(): void {
        const runningScript = this.ns.getRunningScript()
        const money = runningScript.onlineMoneyMade / runningScript.onlineRunningTime
        const exp = runningScript.onlineExpGained /runningScript.onlineRunningTime

        const doc = eval('document')

        doc.getElementById('Money-hook-1').innerHTML = this.ns.nFormat(money, '$0.00a') + '/s'
        doc.getElementById('Exp-hook-1').innerHTML = this.ns.nFormat(exp, '0.00a') + '/s'
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
    
            hooks.push(extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling))
        } else {
            hooks.push(display.parentElement.parentElement)
        }
        console.debug(hooks)
    }
}