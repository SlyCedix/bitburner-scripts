import { NS } from '../../NetscriptDefinitions'
import { getServersWithoutBackdoor } from '/lib/helpers.js'


export async function main(ns: NS): Promise<void> {
    const servers = await getServersWithoutBackdoor(ns)

    if (servers.length > 0) ns.tprint(`INFO: These servers need to be backdoored ${servers}`)
    else ns.tprint('INFO: All rooted servers are backdoored')
}