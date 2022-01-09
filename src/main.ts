import { NS } from '@ns'


const scripts = ['hwgw.js', 'contracts.js', 'watcher.js']

export async function main(ns: NS): Promise<void> {
    for (const script of scripts) {
        ns.scriptKill(script, 'home')
        ns.run(script)
    }
}