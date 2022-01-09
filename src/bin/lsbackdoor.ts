import { NS } from '@ns'
import { getServersWithoutBackdoor } from '/lib/helpers.js'


export async function main(ns: NS): Promise<void> {
    const servers = await getServersWithoutBackdoor(ns)

    if (servers.length > 0) ns.tprintf(`INFO: These servers need to be backdoored ${servers}`)
    else ns.tprintf('INFO: All rooted servers are backdoored')
}