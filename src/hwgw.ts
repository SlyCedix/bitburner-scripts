import { NS } from '../NetscriptDefinitions'

const hackScript = '/hwgw/hack.js'
const growScript = '/hwgw/grow.js'
const weakScript = '/hwgw/weaken.js'

export class Bot {
    readonly ns: NS
    readonly leveling: boolean
    readonly buffer: number
    readonly server: string

    readonly growRam: number
    readonly hackRam: number
    readonly weakRam: number

    target: string

    constructor(ns : NS, server : string, target : string, leveling = false, buffer = 0.0) {
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

    async init() : Promise<void> {
        const files = [hackScript, growScript, weakScript]

        await this.ns.scp(files, this.ns.getHostname(), this.server)

        this.ns.print(`INFO: Bot initialized on ${this.server} attacking ${this.target}`)
    }

    async update() : Promise<void> {
        const serverObj = this.ns.getServer(this.target)
    }

}

// export class Botnet {
//     readonly ns: NS
//     readonly level : boolean

//     target = 'n00dles';

//     constructor(ns : NS, level = false) {
//         this.ns = ns
//         this.level = level
//     }

//     async init() : Promise<void> {
//         this.ns.disableLog('ALL')
    
//         this.portFunctions = getPortFunctions(this.ns)
//         this.nextHackingLevel = getNextHackingLevel(this.ns)
//         rootAll(this.ns)

//         this.setTarget(findBestServer(ns))

//         this.servers = (deepScan(this.ns, this.ns.getHostname())).filter((hostname) => {
//             return this.ns.hasRootAccess(hostname)
//         })

//         this.bots = []

//         for (let i = 0; i < this.servers.length; ++i) {
//             if (this.servers[i] != 'home') this.ns.killall(this.servers[i])
//             const bot = new Bot(this.ns, this.target, this.servers[i], 0, this.leveling)
//             this.bots.push(bot)
//             await bot.init()
//             await this.ns.sleep(25)
//         }

//         this.servers.push('home')
//         const bot = new Bot(this.ns, this.target, 'home', 8, this.leveling)
//         this.bots.push(bot)
//         await bot.init()

//         this.ns.print(`INFO: Botnet initialized (attacking ${this.target})`)

//         this.initUI()
//     }

//     async update() : Promise<null> {
//         const newPortFunctions = getPortFunctions(this.ns)

//         if (newPortFunctions.length > this.portFunctions.length ||
//             this.ns.getHackingLevel() > this.nextHackingLevel) {
//             this.portFunctions = newPortFunctions
//             this.nextHackingLevel = this.ns.getHackingLevel(this.ns)
//             rootAll(this.ns)
//         }

//         if (!this.leveling) {
//             const newBest = findBestServer(this.ns)
//             if (newBest != this.target) {
//                 this.target = newBest
//                 this.bots.forEach((bot) => {
//                     if (bot.target != bot.server) {
//                         if (bot.server != 'home') this.ns.killall(bot.server)
//                         bot.target = newBest
//                     }
//                 })
//             }
//         }

//         const boughtServer = buyServer(this.ns)
//         if (boughtServer) {
//             this.bots = this.bots.filter((hostname) => {
//                 return hostname != boughtServer
//             })

//             const bot = new Bot(this.ns, this.target, boughtServer, 0, this.leveling)
//             this.bots.push(bot)
//             await bot.init()
//         }

//         for (let i = 0; i < this.bots.length; ++i) {
//             await this.bots[i].update()
//             await this.ns.sleep(25)
//         }

//         this.updateUI()
//     }

//     setTarget(target = 'n00dles') : boolean {
//         if (this.level) {
//             return false
//         } else if (this.ns.serverExists(target)) {
//             this.target = target
//             return true
//         }
//         return false
//     }

//     initUI() : void {
//         this.createDisplay('Security')
//         this.createDisplay('Money')
//         this.createDisplay('Target')
//     }

//     updateUI() : void {
//         const moneyAvailable = this.ns.getServerMoneyAvailable(this.target)

//         const securityLevel = this.ns.getServerSecurityLevel(this.target)

//         const doc = eval('document')

//         doc.getElementById('Target-hook-1').innerHTML = this.target
//         doc.getElementById('Money-hook-1').innerHTML = this.ns.nFormat(moneyAvailable, '$0.0a')
//         doc.getElementById('Security-hook-1').innerHTML = this.ns.nFormat(securityLevel, '0.0')
//     }

//     createDisplay(name : string) : void {
//         const doc = eval('document')
//         const display = doc.getElementById(name + '-hook-0')

//         if (typeof (display) == 'undefined' || display == null) {
//             const extraHookRow = doc.getElementById('overview-extra-hook-0').parentElement.parentElement
//             const clonedRow = extraHookRow.cloneNode(true)

//             clonedRow.childNodes[0].childNodes[0].id = name + '-hook-0'
//             clonedRow.childNodes[0].childNodes[0].innerHTML = name
//             clonedRow.childNodes[1].childNodes[0].id = name + '-hook-1'
//             clonedRow.childNodes[2].childNodes[0].id = name + '-hook-2'

//             extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling)
//         }
//     }
// }