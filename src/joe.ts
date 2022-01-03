import { NS } from '../NetscriptDefinitions'
import { deepScan, rootAll } from './lib/helpers'

const growScript = '/hwgw/grow.js'
const weakScript = '/hwgw/weaken.js'

export async function main(ns : NS) : Promise<void> {
    const joenet = new Joenet(ns)
    await joenet.init()

    while(true) {
        await joenet.update()
        await ns.sleep(10)
    }
}

class Joebot {
    readonly ns : NS
    readonly server : string

    constructor(ns : NS, server : string) {
        this.ns = ns
        this.server = server
    }

    async init() : Promise<void> {
        const files = [growScript, weakScript]
        await this.ns.scp(files, 'home', this.server)
    }

    async update() : Promise<void> {
        const maxT = Math.floor(this.freeRam / 1.75)
        if(maxT > 0) {
            if(this.ns.getServerSecurityLevel('joesguns') != this.ns.getServerMinSecurityLevel('joesguns')) {
                this.ns.exec(weakScript, this.server, maxT, 'joesguns', 0)
            } else {
                this.ns.exec(growScript, this.server, maxT, 'joesguns', 0)
            }
        }
    }

    get freeRam() : number {
        return this.ns.getServerMaxRam(this.server) - this.ns.getServerUsedRam(this.server)
    }
}

class Joenet {
    readonly ns : NS
    readonly bots : Joebot[] = []

    constructor(ns : NS) {
        this.ns = ns
    }

    async init() : Promise<void> {
        rootAll(this.ns)
        const servers = deepScan(this.ns).filter((server) => {
            return this.ns.getServer(server).hasAdminRights &&
            !this.ns.getPurchasedServers().includes(server) &&
            server != 'home'
        })

        for(const server of servers) {
            const bot = new Joebot(this.ns, server)
            await bot.init()
            this.bots.push(bot)
        }
    }

    async update() : Promise<void> {
        const newServers = rootAll(this.ns)
        if(newServers.length > 0) {
            for(const server of newServers) {
                const bot = new Joebot(this.ns, server)
                await bot.init()
                this.bots.push(bot)
            }
        }

        for(const bot of this.bots) {
            await bot.update()
        }
    }
}