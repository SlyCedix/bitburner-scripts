import { NS } from '@ns'
import daemons from 'startup-daemons'

export function main(ns: NS): void {
    ns.ps()
        .filter(p => p.filename != ns.getScriptName())
        .forEach(p => ns.kill(p.pid))

    daemons.forEach(s => ns.run(`/daemon/${s}.js`))
}