import { NS } from '@ns'

const pref = '/daemon/'
const suff = '.js'

export async function main(ns : NS) : Promise<void> {
    const flags = ns.flags([
        ['start', []],
        ['stop', []],
        ['restart', []],
    ]) as Flags

    const journal = async (s: string) => {
        await ns.write('journal.txt', `${Date.now()}: ${s}\n`, 'a')
    }

    const fail = async (d: string, e: string, a: string) => {
        const message = `Could not ${a} ${d}: ${e}`
        ns.tprintf(`ERROR: ${message}`)
        await journal(message)
    }

    const success =  async (d:string, a: string) => {
        const message = `${a} ${d}`
        ns.tprintf(`SUCCESS: ${message}`)
        await journal(message)
    }
    let daemons : string[] = []
    if(ns.fileExists('daemons.txt')) daemons = JSON.parse(await ns.read('daemons.txt')) as string[]


    for(const d of flags.start) {
        const path = pref + d + suff

        if(daemons.includes(d)) {
            await fail(d, 'Daemon already running', 'start')
            continue
        }

        if(!ns.fileExists(path)) {
            await fail(d, 'Could not locate daemon', 'start')
            continue
        }

        if(!ns.run(path)) {
            await fail(d, 'Failed to run', 'start')
            continue
        }

        daemons.push(d)
        await success(d, 'Started')
    }

    for(const d of flags.stop) {
        const path = pref + d + suff

        if(!daemons.includes(d)) {
            await fail(d, 'Daemon not running', 'stop')
            continue
        }

        if(!ns.fileExists(path)) {
            await fail(d, 'Could not locate daemon', 'stop')
            continue
        }

        ns.kill(path, ns.getHostname())
        daemons = daemons.filter((daemon) => daemon != d)
        await success(d, 'Stopped')
    }

    for(const d of flags.restart) {
        const path = pref + d + suff

        if(!daemons.includes(d)) {
            await fail(d, 'Daemon not running', 'restart')
            continue
        }

        if(!ns.fileExists(path)) {
            await fail(d, 'Could not locate daemon', 'restart')
            continue
        }

        ns.kill(path, ns.getHostname())
        if(!ns.run(path)) {
            await fail(d, 'Failed to run', 'restart')
            continue
        }

        await success(d, 'Restarted')
    }

    await ns.write('daemons.txt', JSON.stringify(daemons, null, 2), 'w')
}

interface Flags {
    'start': string[];
    'stop': string[];
    'restart': string[];
    '_': string[];
}