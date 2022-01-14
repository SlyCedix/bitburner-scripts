import { NS } from '@ns'
import { getServersWithContracts } from 'lib/helpers'


export function main(ns: NS): void {
    const servers = getServersWithContracts(ns)

    if (servers.length > 0) ns.tprintf(`INFO: These servers have contracts ${servers.toString()}`)
    else ns.tprintf('INFO: There are no servers with contracts')
}