import { NS } from '../NetscriptDefinitions'
import { HackingFormulas } from './lib/formulas'
import {
    buyServer,
    deepScan, findBestServer, getPortFunctions, rootAll
} from '/lib/helpers.js'

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
        await ns.sleep(10)
    }
}

const weakenScript = '/hack/weaken.js'
const growScript = '/hack/grow.js'
const hackScript = '/hack/hack.js'

const HackSecurityEffect = 0.002
const WeakSecurityEffect = 0.05
const GrowSecurityEffect = 0.004

const bbBaseGrowth = 1.03
const bbMaxGrowth = 1.0035
const fundPct = 0.5
class Bot {
    ns: NS
    target: string
    server: string
    buffer: number
    weakenOnly: boolean

    reqHackSkill: number
    hackDiff: number
    weakenRam: number
    growRam: number
    hackRam: number

    constructor(ns: NS, server: string, target = 'n00dles', buffer = 0.0, weakenOnly = false) {
        ns.disableLog('ALL')

        this.ns = ns
        this.target = target
        this.server = server
        this.buffer = buffer
        this.weakenOnly = weakenOnly

        if (ns.getServerMaxMoney(server) > 0 && ns.getHackingLevel() > ns.getServerRequiredHackingLevel(server)) {
            this.target = server
            this.weakenOnly = false
        }

        this.reqHackSkill = ns.getServerRequiredHackingLevel(target)
        this.hackDiff = ns.getServerMinSecurityLevel(target)

        this.weakenRam = ns.getScriptRam(weakenScript)
        this.growRam = ns.getScriptRam(growScript)
        this.hackRam = ns.getScriptRam(hackScript)
    }

    async init(): Promise<void> {
        const files = [weakenScript, growScript, hackScript]

        await this.ns.scp(files, 'home', this.server)

        this.ns.print(`INFO: Bot initialized (${this.server} attacking ${this.target})`)
    }

    async update(): Promise<void> {
        if (this.target != this.server &&
        this.ns.getServerMaxMoney(this.server) > 0 &&
        this.ns.getHackingLevel() > this.ns.getServerRequiredHackingLevel(this.server)) {
            this.target = this.server
            this.weakenOnly = false
        }

        const totalRam = this.ns.getServerRam(this.server)
        const freeRam = totalRam[0] - totalRam[1] - this.buffer
        const maxWeaken = Math.floor(freeRam / this.weakenRam)
        let hackT: number
        let weakenT: number
        let growT: number
        let ramNeeded: number

        switch (this.status) {
        case 0:
            this.runScript(weakenScript, maxWeaken)
            break

        case 1:
            weakenT = Math.floor(maxWeaken * 0.08)
            growT = maxWeaken - weakenT
            this.runScript(weakenScript, weakenT)
            this.runScript(growScript, growT)
            break

        case 2:
            hackT = Math.floor(fundPct / this.hackPct)
            growT = Math.ceil(fundPct / (Math.log(this.growPct) / Math.log(1/(1 - fundPct))))
            weakenT = Math.ceil(((hackT * 0.002) + (growT * 0.004)) / 0.05)
            ramNeeded = hackT * this.hackRam + growT * this.growRam + weakenT * this.weakenRam

            if (ramNeeded > freeRam) {
                const scaleFactor = freeRam / ramNeeded
                hackT = Math.floor(hackT * scaleFactor)
                growT = Math.floor(growT * scaleFactor)
                weakenT = Math.floor(weakenT * scaleFactor)
            }

            this.runScript(hackScript, hackT)
            this.runScript(growScript, growT)
            this.runScript(weakenScript, weakenT)
            
            break

        default:
            this.ns.print(`ERROR: Invalid target server ${this.target}`)
        }
    }

    get hackPct(): number {
        return HackingFormulas.hackPercent(this.ns.getServer(this.target), this.ns.getPlayer())
    }

    get growPct(): number {
        return HackingFormulas.growPercent(this.ns.getServer(this.target), 1, this.ns.getPlayer(), this.ns.getServer(this.server).cpuCores)
    }

    get status(): number {
        if (this.ns.getServerMaxMoney(this.target) == 0) {
            return -1
        }
        if ((this.ns.getServerMinSecurityLevel(this.target) > this.ns.getServerSecurityLevel(this.target) + 2) ||
        this.weakenOnly) {
            return 0
        }
        if (this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target) * 0.90) {
            return 1
        }
        return 2
    }

    runScript(script: string, threadCount: number): void {
        const totalRam = this.ns.getServerRam(this.server)
        const freeRam = totalRam[0] - totalRam[1]

        if (threadCount > 0 && this.ns.getScriptRam(script) * threadCount <= freeRam) {
            let n = 0

            while (!this.ns.exec(script, this.server, threadCount, this.target, n)) {
                n++
            }

            this.ns.print(`INFO: Bot executing ${script} on ${this.target} (t=${threadCount}) on ${this.server}`)
        }
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

        for (let i = 0; i < this.servers.length; ++i) {
            let buffer = 16
            if (this.servers[i] != 'home') {
                this.ns.killall(this.servers[i])
                buffer = 0
            }
            const bot = new Bot(this.ns, this.servers[i], this.target, buffer, this.leveling)
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
            rootAll(this.ns)
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
            const bot = new Bot(this.ns, boughtServer as string, this.target, 0, this.leveling)
            this.bots.push(bot)
            await bot.init()
        }

        for (const bot of this.bots) {
            await bot.update()
            this.updateUI()
        }
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

            hooks.push(extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling))
        } else {
            hooks.push(display.parentElement.parentElement)
        }
        console.debug(hooks)
    }
}