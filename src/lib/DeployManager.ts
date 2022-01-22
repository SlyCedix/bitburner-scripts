import { NS } from '@ns'
import { deepScan, getServerFreeRam } from 'lib/helpers'

export const DeployManager = {
    deploy: (ns: NS, script: string, threads: number, ...args: (string | boolean | number)[]): number => {
        const reqRam = ns.getScriptRam(script) * threads
        const servers = deepScan(ns)
            .filter(s => ns.getServer(s).hasAdminRights)
            .filter(s => getServerFreeRam(ns, s) >= reqRam)

        let server

        if (servers.length == 0) return 0
        if (servers.length == 1) server = servers[0]
        else server = servers.reduce((a, b) => getServerFreeRam(ns, b) > getServerFreeRam(ns, a) ? b : a)

        return ns.exec(script, server, threads, ...args)
    },

    getMaxDeployRam: (ns: NS): number => {
        const servers = deepScan(ns)
            .filter(s => ns.getServer(s).hasAdminRights)

        if (servers.length == 0) return 0
        if (servers.length == 1) return getServerFreeRam(ns, servers[0])

        const server = servers.reduce((a, b) => getServerFreeRam(ns, b) > getServerFreeRam(ns, a) ? b : a)

        return getServerFreeRam(ns, server)
    },

    // storeDeploy: (ns: NS, ram: number): void => {

    // }
}