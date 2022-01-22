import { NS, Server } from '@ns'
import { ActionTimes, HackRatios } from '@types'
import { createStatDisplay, deleteStatDisplay, updateStatDisplay } from 'lib/DOMhelpers'
import { HackingFormulas } from 'lib/formulas'
import { deepScan, formatMoney, rankServers, rootAll, upgradeAllServers } from 'lib/helpers'
import { buyAll } from 'lib/singularity'

const hackScript = '/hwgw/hack.js'
const growScript = '/hwgw/grow.js'
const weakScript = '/hwgw/weaken.js'

const HackSecurityEffect = 0.002
const WeakSecurityEffect = 0.05
const GrowSecurityEffect = 0.004


// TODO: Make hackpct adjustment not crash the game
// const hackPcts: Record<string, number> = {}

export async function main(ns: NS): Promise<void> {
    // Restarts everything if game ran offline
    const runnningScript = ns.getRunningScript()
    if (runnningScript.offlineRunningTime > 1) {
        ns.exec('main.js', 'home')
        ns.exit()
    } else {
        ns.exec('/bin/monitor.js', 'home', 1, ns.getScriptName())
        // ns.tail('/bin/monitor.js')
    }


    // if (ns.fileExists('hackpcts.txt')) {
    //     hackPcts = JSON.parse(ns.read('hackpcts.txt'))
    // }

    const botnet = new Botnet(ns)
    await botnet.init()

    ns.atExit(() => {
        deleteStatDisplay('Money')
        deleteStatDisplay('Exp')
    })

    while (true) {
        await botnet.update()
        // await ns.write('hackpcts.txt', [JSON.stringify(hackPcts, null, 4)], 'w')
        await ns.sleep(0)
    }
}

export class Bot {
    readonly ns: NS
    readonly buffer: number
    readonly server: string

    readonly growRam: number
    readonly hackRam: number
    readonly weakRam: number

    target: string

    private _timeB = 150
    private _minTime = 100
    private _maxTime = 200
    private _adjustmentCount = 2

    private _hackPercent = 0.99
    // private _maxHack = 0.99
    // private _minHack = 0.25

    constructor(ns: NS, server: string, target: string, buffer = 0) {
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

        // if (hackPcts.hasOwnProperty(this.target)) {
        //     this._hackPercent = hackPcts[this.target]
        // }

        this.ns.print(`INFO: Bot initialized on ${this.server} attacking ${this.target}`)
    }

    async update(): Promise<void> {
        if (!this.ns.serverExists(this.server)) return
        if (this.ns.getServerMaxMoney(this.target) == 0) return

        const ps = this.ns.ps(this.server).filter((p) => {
            return p.filename == weakScript
        })

        if (ps.length == 0) {
            const ratios = await this.getRatios()
            if (ratios.hackT > 0) await this.deployBatches(ratios)
            else this.deployPrep(ratios)
        }
    }

    private deployPrep(ratios: HackRatios): void {
        const times = this.times // Can change at runtime, better if constant

        const growDelay = times.weaken - times.grow

        this.ns.print(`INFO: Prep ${this.target}@${this.server}`)
        let delay = this._timeB
        const startTime = performance.now()
        if (ratios.weakT > 0)
            this.ns.exec(weakScript, this.server, ratios.weakT, this.target, startTime + delay)
        delay += this._timeB
        if (ratios.growT > 0)
            this.ns.exec(growScript, this.server, ratios.growT, this.target, startTime + growDelay + delay)
        delay += this._timeB
        if (ratios.weak2T > 0)
            this.ns.exec(weakScript, this.server, ratios.weak2T, this.target, startTime + delay)
    }

    private async deployBatches(ratios: HackRatios): Promise<void> {
        const totalRam = (ratios.weakT + ratios.weak2T) * this.weakRam +
            ratios.growT * this.growRam +
            ratios.hackT * this.hackRam

        // Can change at runtime, better if constant
        const times = this.times

        // Max number of batches if undersaturated
        const maxBatches = Math.floor(this.freeRam / totalRam)
        const saturationBatches = Math.floor(times.weaken / (this._timeB * 4))
        const numBatches = Math.min(maxBatches, saturationBatches)

        // Calculate delays between weaken and hack/grow
        const hackDelay = times.weaken - times.hack
        const growDelay = times.weaken - times.grow

        let count = 0

        // Prepare timekeeping
        let delay = this._timeB
        const startTime = performance.now()

        for (let i = 0; i < numBatches; ++i) {
            ++count

            // Deploy Hack
            this.ns.exec(hackScript, this.server, ratios.hackT, this.target, startTime + hackDelay + delay)
            delay += this._timeB

            // Deploy Weak1
            this.ns.exec(weakScript, this.server, ratios.weakT, this.target, startTime + delay)
            delay += this._timeB

            // Deploy Grow
            this.ns.exec(growScript, this.server, ratios.growT, this.target, startTime + growDelay + delay)
            delay += this._timeB

            // Deploy Weak2
            this.ns.exec(weakScript, this.server, ratios.weak2T, this.target, startTime + delay)
            delay += this._timeB

            await this.ns.sleep(0)
        }
        // @ts-ignore can't import lodash without breaking things
        this._timeB = _.clamp(this._timeB - (1 / Math.log2(this._adjustmentCount++)), this._minTime, this._maxTime)
        // @ts-ignore can't import lodash without breaking things
        // this._hackPercent = _.clamp(this._hackPercent - 0.01, this._minHack, this._maxHack)
        // hackPcts[this.target] = this._hackPercent
        this.ns.print(`INFO: ${count} batches on ${this.target}@${this.server}`)
    }


    simulateHack(serverData: Server, maxThreads: number, take = 1): [number, Server] {
        const hackAmount = HackingFormulas.hackPercent(serverData, this.ns.getPlayer())
        const hackT = Math.floor(take / hackAmount)
        if (hackT > maxThreads) {
            return [-1, serverData]
        } else {
            serverData.moneyAvailable -= take * serverData.moneyMax
            if (serverData.moneyAvailable <= 0) serverData.moneyAvailable = 0
            serverData.hackDifficulty += hackT * HackSecurityEffect
            return [hackT, serverData]
        }
    }

    simulateWeaken(serverData: Server, maxThreads: number): [number, Server] {
        const weakT = Math.ceil((serverData.hackDifficulty - serverData.minDifficulty) /
            (WeakSecurityEffect * (1 + this.ns.getServer(this.server).cpuCores / 16)))
        if (weakT > maxThreads) {
            return [-1, serverData]
        } else {
            serverData.hackDifficulty = serverData.minDifficulty
            return [weakT, serverData]
        }
    }

    async simulateGrowth(serverData: Server, maxThreads: number): Promise<[number, Server]> {
        if (serverData.moneyAvailable <= 0) serverData.moneyAvailable = 1
        if (serverData.moneyMax == serverData.moneyAvailable) return [0, serverData]
        if (maxThreads == Infinity) maxThreads = Math.floor(2 ** 30 / this.growRam)
        else if ((serverData.moneyMax / serverData.moneyAvailable) >
            HackingFormulas.growPercent(serverData, maxThreads, this.ns.getPlayer(),
                this.ns.getServer(this.server).cpuCores)) return [-1, serverData]

        const margin = 1.2 // Potential growth buffer
        let upper = maxThreads
        let lower = 1
        while (upper != lower) {
            const newServer = JSON.parse(JSON.stringify(serverData)) as Server
            const growT = Math.ceil((upper + lower) / 2)
            if (growT < 1) break
            newServer.moneyAvailable += growT
            newServer.moneyAvailable *= HackingFormulas.growPercent(newServer, growT, this.ns.getPlayer(),
                this.ns.getServer(this.server).cpuCores)
            newServer.hackDifficulty += growT * GrowSecurityEffect

            //@ts-ignore
            if (_.inRange(newServer.moneyAvailable, newServer.moneyMax, newServer.moneyMax * margin) ||
                (newServer.moneyAvailable > newServer.moneyMax && upper - lower == 1)) {
                newServer.moneyAvailable = newServer.moneyMax
                return [growT, newServer]
            } else if (newServer.moneyAvailable < newServer.moneyMax) {
                lower = growT
            } else {
                upper = growT
            }
            await this.ns.sleep(0)
        }

        return [-1, serverData]
    }

    async getRatios(): Promise<HackRatios> {
        let hackRatios = {
            hackT: 0,
            weakT: 0,
            growT: 0,
            weak2T: 0,
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

            sim = await this.simulateGrowth(serverData, Infinity)
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
                hackRatios.weak2T = Math.ceil(hackRatios.weak2T * ramFactor)
            }

            //@ts-ignore using lodash
            this._timeB = _.clamp(5 / Math.log2(this._adjustmentCount++), this._minTime, this._maxTime)
            return hackRatios
        }

        serverData.moneyAvailable = serverData.moneyMax
        serverData.hackDifficulty = serverData.minDifficulty

        const hackAmount = HackingFormulas.hackPercent(serverData, this.ns.getPlayer())
        let maxMoneyPerHack = Math.min(Math.floor(freeRam / this.hackRam) * hackAmount, this._hackPercent)
        let minMoneyPerHack = hackAmount

        let bestRatios: HackRatios = {
            hackT: 0,
            weakT: 0,
            growT: 0,
            weak2T: 0,
        }

        while (maxMoneyPerHack - minMoneyPerHack > hackAmount) {
            const currMoneyPerHack = (maxMoneyPerHack + minMoneyPerHack) / 2
            hackRatios = {
                hackT: 0,
                weakT: 0,
                growT: 0,
                weak2T: 0,
            }

            serverData.moneyAvailable = serverData.moneyMax
            serverData.hackDifficulty = serverData.minDifficulty

            // Hack
            let maxT = Math.floor(freeRam / this.hackRam)
            let sim = this.simulateHack(serverData, maxT, currMoneyPerHack)
            hackRatios.hackT = sim[0]
            serverData = sim[1]

            if (sim[0] == -1) {
                maxMoneyPerHack = currMoneyPerHack
                continue
            }
            if (hackRatios.hackT == 0) break
            let totalRam = hackRatios.hackT * this.hackRam

            // First Weaken
            maxT = Math.floor((freeRam - totalRam) / this.hackRam)
            sim = this.simulateWeaken(serverData, maxT)
            hackRatios.weakT = sim[0]
            serverData = sim[1]

            if (sim[0] == -1) {
                maxMoneyPerHack = currMoneyPerHack
                continue
            }
            totalRam += hackRatios.weakT * this.weakRam

            //Grow
            maxT = Math.floor((freeRam - totalRam) / this.hackRam)
            sim = await this.simulateGrowth(serverData, maxT)
            hackRatios.growT = sim[0]
            serverData = sim[1]

            if (sim[0] == -1) {
                maxMoneyPerHack = currMoneyPerHack
                continue
            }
            totalRam += hackRatios.growT * this.growRam

            // Second weaken
            maxT = Math.floor((freeRam - totalRam) / this.hackRam)
            sim = this.simulateWeaken(serverData, maxT)
            hackRatios.weak2T = sim[0]
            serverData = sim[1]

            if (sim[0] == -1) {
                maxMoneyPerHack = currMoneyPerHack
                continue
            }

            totalRam += hackRatios.weak2T * this.weakRam

            if (totalRam > freeRam) {
                maxMoneyPerHack = currMoneyPerHack
                continue
            }

            bestRatios = hackRatios

            minMoneyPerHack = currMoneyPerHack

        }

        return bestRatios
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

    get freeRam(): number {
        return this.ns.getServerMaxRam(this.server) - this.ns.getServerUsedRam(this.server) - this.buffer
    }
}

export class Botnet {
    readonly ns: NS

    targets: string[] = []
    bots: Bot[] = []

    constructor(ns: NS) {
        ns.disableLog('ALL')
        this.ns = ns
    }

    async init(): Promise<void> {
        buyAll(this.ns)
        rootAll(this.ns)

        this.targets = rankServers(this.ns)

        const servers = (deepScan(this.ns)).filter((hostname) => {
            return this.ns.hasRootAccess(hostname)
        })

        let n = 0
        for (const server of servers) {
            let buffer = 16
            if (server != 'home') {
                this.ns.killall(server)
                buffer = 0
            }
            let target = this.targets.slice(-1)[0]
            if (this.ns.getPurchasedServers().includes(server) || server == 'home') {
                target = this.targets[n++] ?? this.targets.slice(-1)[0]
            }
            const bot = new Bot(this.ns, server, target, buffer)
            this.bots.push(bot)
            await bot.init()
        }
        this.initUI()
        this.ns.print('INFO: Botnet initialized')
    }

    async update(): Promise<void> {
        await this.newBots()
        this.updateTargets()
        this.removeSmallBots()
        await this.upgradePservs()
        for (const bot of this.bots) {
            this.updateUI()
            await bot.update()
        }
    }

    /**
     * Attempts to root all servers and create bots for the new servers
     */
    private async newBots(): Promise<void> {
        buyAll(this.ns)
        const newServs = rootAll(this.ns)
        if (newServs.length > 0) {
            for (const server of newServs) {
                const bot = new Bot(this.ns, server, this.targets.slice(-1)[0])
                this.bots.push(bot)
                await bot.init()
            }
        }
    }

    /**
     * Checks if there are new target rankings and update if necessary
     */
    private updateTargets(): void {
        this.targets = rankServers(this.ns)
        let n = 0
        for (const bot of this.bots) {
            if (bot.server == 'home' || this.ns.getPurchasedServers().includes(bot.server)) {
                bot.target = this.targets[n++] ?? this.targets.slice(-1)[0]
            }
        }
    }

    /**
     * Removes all bots with less ram than pservs
     */
    private removeSmallBots(): void {
        this.bots = this.bots.filter((bot) => {
            const pservs = this.ns.getPurchasedServers()
            if (pservs.length == 0) return true
            const minRam = this.ns.getServerMaxRam(pservs[0])
            return bot.server == 'home' ||
                bot.server.includes('pserv') ||
                this.ns.getServerMaxRam(bot.server) >= minRam
        })
    }

    /**
     * Attempt to upgrade all pservs and create new bots for the new servers
     */
    private async upgradePservs(): Promise<void> {
        if (upgradeAllServers(this.ns)) {
            this.bots = this.bots.filter(bot => !this.ns.getPurchasedServers().includes(bot.server))
            let n = 0
            for (const server of this.ns.getPurchasedServers()) {
                const bot = new Bot(this.ns, server, this.targets[n++] ?? this.targets.slice(-1)[0])
                this.bots.push(bot)
                await bot.init()
            }
        }
    }

    private initUI(): void {
        createStatDisplay('Exp', this.ns.ui.getTheme().hack)
        createStatDisplay('Money', this.ns.ui.getTheme().money, false)
    }

    private updateUI(): void {
        const money = this.ns.getScriptIncome()[0]
        const exp = this.ns.getScriptExpGain()

        updateStatDisplay('Money', formatMoney(this.ns, money) + '/s')
        updateStatDisplay('Exp', this.ns.nFormat(exp, '0.00a') + '/s')
    }
}