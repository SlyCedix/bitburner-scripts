import { NS } from '@ns'
import { getServersWithoutBackdoor } from 'lib/helpers'


export function main(ns: NS): void {
    const servers = getServersWithoutBackdoor(ns)

    if (servers.length > 0) ns.tprintf(`INFO: These servers need to be backdoored ${servers.toString()}`)
    else ns.tprintf('INFO: All rooted servers are backdoored')
}