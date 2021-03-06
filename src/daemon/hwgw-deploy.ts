import { NS, Server } from '@ns'
import { ActionTimes, HackRatios } from '@types'
import { createStatDisplay, deleteStatDisplay, updateStatDisplay } from 'lib/DOMhelpers'
import { HackingFormulas } from 'lib/formulas'
import {
    deploy,
    formatMoney,
    getMaxDeployRam,
    getNetworkRam,
    rankServers,
    rootAll,
    upgradeAllServers,
} from 'lib/helpers'
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
    botnet.init()

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

    readonly growRam: number
    readonly hackRam: number
    readonly weakRam: number

    target: string

    private _timeB = 200
    // private _minTime = 500
    // private _maxTime = 1500
    private _adjustmentCount = 2
    private _endTime = 0

    private _hackPercent = 0.99

    constructor(ns: NS, target: string) {
        this.ns = ns
        this.target = target

        this.hackRam = ns.getScriptRam(hackScript)
        this.growRam = ns.getScriptRam(growScript)
        this.weakRam = ns.getScriptRam(weakScript)
    }

    init(): void {
        this.ns.print(`INFO: Bot initialized attacking ${this.target}`)
    }

    async update(): Promise<void> {
        const ratios = await this.getRatios()
        if (ratios.hackT > 0) this.deployBatches(ratios)
        else this.deployPrep(ratios)
    }

    private deployPrep(ratios: HackRatios): void {
        const times = this.times // Can change at runtime, better if constant

        const growDelay = times.weaken - times.grow

        this.ns.print(`INFO: Prep ${this.target}`)
        let delay = this._timeB
        const startTime = performance.now()
        if (ratios.weakT > 0) deploy(this.ns, weakScript, ratios.weakT, this.target, startTime + delay)
        delay += this._timeB
        if (ratios.growT > 0) deploy(this.ns, growScript, ratios.growT, this.target, startTime + growDelay + delay)
        delay += this._timeB
        if (ratios.weak2T > 0) deploy(this.ns, weakScript, ratios.weak2T, this.target, startTime + delay)

        this._endTime = performance.now() + times.weaken + 3 * this._timeB
    }

    private deployBatches(ratios: HackRatios): void {
        const totalRam = (ratios.weakT + ratios.weak2T) * this.weakRam +
            ratios.growT * this.growRam +
            ratios.hackT * this.hackRam

        // Can change at runtime, better if constant
        const times = this.times

        // Max number of batches if undersaturated
        let numBatches = Math.max(Math.floor(times.weaken / (this._timeB * 4)), 1)
        if (numBatches * totalRam > getNetworkRam(this.ns)) {
            numBatches = Math.floor(getNetworkRam(this.ns) / totalRam)
        }

        // Calculate delays between weaken and hack/grow
        const hackDelay = times.weaken - times.hack
        const growDelay = times.weaken - times.grow

        let count = 0
        // Prepare timekeeping
        let delay = this._timeB
        const startTime = performance.now()

        for (let i = 0; i < numBatches; ++i) {
            const currBatch : number[] = []

            // Deploy Hack
            currBatch.push(deploy(this.ns, hackScript, ratios.hackT, this.target, startTime + hackDelay + delay))
            if(currBatch.slice(-1)[0] == 0) {
                currBatch.forEach(p => this.ns.kill(p))
                break
            }
            delay += this._timeB

            // Deploy Weak1
            currBatch.push(deploy(this.ns, weakScript, ratios.weakT, this.target, startTime + delay))
            if(currBatch.slice(-1)[0] == 0) {
                currBatch.forEach(p => this.ns.kill(p))
                break
            }
            delay += this._timeB

            // Deploy Grow
            currBatch.push(deploy(this.ns, growScript, ratios.growT, this.target, startTime + growDelay + delay))
            if(currBatch.slice(-1)[0] == 0) {
                currBatch.forEach(p => this.ns.kill(p))
                break
            }
            delay += this._timeB

            // Deploy Weak2
            currBatch.push(deploy(this.ns, weakScript, ratios.weak2T, this.target, startTime + delay))
            if(currBatch.slice(-1)[0] == 0) {
                currBatch.forEach(p => this.ns.kill(p))
                break
            }
            delay += this._timeB
            count++
        }
        if(count > 0) {
            this.ns.print(`INFO: ${count} batches on ${this.target}`)
            this._endTime = startTime + times.weaken + (count + 1) * 4 * this._timeB
        }
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
        const weakT = Math.ceil((serverData.hackDifficulty - serverData.minDifficulty) / WeakSecurityEffect)
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
            HackingFormulas.growPercent(serverData, maxThreads, this.ns.getPlayer())) return [-1, serverData]

        const margin = 1.2 // Potential growth buffer
        let upper = maxThreads
        let lower = 1
        while (upper != lower) {
            const newServer = JSON.parse(JSON.stringify(serverData)) as Server
            const growT = Math.ceil((upper + lower) / 2)
            if (growT < 1) break
            newServer.moneyAvailable += growT
            newServer.moneyAvailable *= HackingFormulas.growPercent(newServer, growT, this.ns.getPlayer())
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

        const freeRam = getNetworkRam(this.ns)

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

            if (totalRam > getMaxDeployRam(this.ns)) {
                const ramFactor = getMaxDeployRam(this.ns) / totalRam
                hackRatios.weakT = Math.floor(hackRatios.weakT * ramFactor)
                hackRatios.growT = Math.floor(hackRatios.growT * ramFactor)
                hackRatios.weak2T = Math.ceil(hackRatios.weak2T * ramFactor)
            }

            //@ts-ignore using lodash
            // this._timeB = _.clamp(5 / Math.log2(this._adjustmentCount++), this._minTime, this._maxTime)
            return hackRatios
        }

        serverData.moneyAvailable = serverData.moneyMax
        serverData.hackDifficulty = serverData.minDifficulty

        const hackAmount = HackingFormulas.hackPercent(serverData, this.ns.getPlayer())
        let maxMoneyPerHack = Math.min(
            Math.floor(getMaxDeployRam(this.ns) / this.hackRam) * hackAmount,
            this._hackPercent)
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
            const maxT = Math.floor(getMaxDeployRam(this.ns) / this.hackRam)
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
            sim = this.simulateWeaken(serverData, maxT)
            hackRatios.weakT = sim[0]
            serverData = sim[1]

            if (sim[0] == -1) {
                maxMoneyPerHack = currMoneyPerHack
                continue
            }
            totalRam += hackRatios.weakT * this.weakRam

            //Grow
            sim = await this.simulateGrowth(serverData, maxT)
            hackRatios.growT = sim[0]
            serverData = sim[1]

            if (sim[0] == -1) {
                maxMoneyPerHack = currMoneyPerHack
                continue
            }
            totalRam += hackRatios.growT * this.growRam

            // Second weaken
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

    isRunning(): boolean {
        return performance.now() < this._endTime
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

    init(): void {
        buyAll(this.ns)
        rootAll(this.ns)

        this.targets = rankServers(this.ns)

        for (const target of this.targets) {
            const bot = new Bot(this.ns, target)
            this.bots.push(bot)
            bot.init()
        }

        this.initUI()
        this.ns.print('INFO: Botnet initialized')
    }

    async update(): Promise<void> {
        this.updateTargets()
        upgradeAllServers(this.ns)
        const freeBots = this.bots.filter(b => !b.isRunning())
        for (const bot of freeBots) {
            this.updateUI()
            await bot.update()
            await this.ns.sleep(0)
        }
    }

    /**
     * Checks if there are new target rankings and update if necessary
     */
    private updateTargets(): void {
        buyAll(this.ns)
        rootAll(this.ns)

        const targets = rankServers(this.ns)
        if (targets.length > this.targets.length) {
            const newTargets = targets.filter(s => !this.targets.includes(s))
            this.targets = targets

            for (const target of newTargets) {
                const bot = new Bot(this.ns, target)
                this.bots.push(bot)
                bot.init()
            }
        }
        this.bots.sort((a, b) => this.targets.indexOf(a.target) - this.targets.indexOf(b.target))
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