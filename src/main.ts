import { NS } from '@ns'


const scripts = ['hwgw.js', 'homeUpgrade.js', 'contracts.js', 'watcher.js']
const kill = ['/hwgw/hack.js', '/hwgw/weaken.js', '/hwgw/grow.js']

export async function main(ns: NS): Promise<void> {
    for (const script of kill) {
        ns.scriptKill(script, 'home')
    }

    for (const script of scripts) {
        ns.scriptKill(script, 'home')
        ns.run(script)
    }
}