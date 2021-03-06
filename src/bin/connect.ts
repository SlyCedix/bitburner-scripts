import { NS } from '@ns'
import { ServerData } from '@types'
import { connectToServer } from 'lib/singularity'

export function main(ns: NS): void {
    if (ns.args.length != 1) {
        ns.tprintf('ERROR: Incorrect usage of connect command. Usage: connect [ip/hostname]')
        return
    }

    if (connectToServer(ns, ns.args[0] as string)) ns.tprintf(`Connected to ${ns.args[0] as string}`)
    else ns.tprintf(`ERROR: Host ${ns.args[0] as string} not found.`)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: ServerData, args: string[]): string[] {
    return [...data.servers]
}