import { NS } from '@ns'

const scripts = ['hwgw.js', 'homeUpgrade.js', 'contracts.js', 'watcher.js']

export function main(ns: NS): void {
    ns.ps()
        .filter(p => p.filename != ns.getScriptName())
        .forEach(p => ns.kill(p.pid))

    scripts.forEach(s => ns.run(s))
}