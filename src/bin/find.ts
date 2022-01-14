import { NS } from '@ns'
import { ServerData } from '@types'
import { findServer } from 'lib/helpers'


export function main(ns: NS): void {
    ns.tprintf((findServer(ns, ns.args[0] as string)).join(' > '))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: ServerData, args: string[]): string[] {
    return [...data.servers]
}