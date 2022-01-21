import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    ns.ps()
        .filter(p => p.filename != ns.getScriptName())
        .forEach(p => ns.kill(p.pid))

    const daemons = JSON.parse(await ns.read('daemons.txt')) as string[]
    daemons.forEach(s => ns.run(`/daemon/${s}.js`))
}