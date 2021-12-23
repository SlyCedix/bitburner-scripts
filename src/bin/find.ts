import { NS } from '../../bitburner/src/ScriptEditor/NetscriptDefinitions'
import { ServerData } from '../../types'

import { findServer } from '/lib/helpers.js'

export async function main(ns : NS) : Promise<void> {
    ns.tprint(await findServer(ns, ns.args[0].toString()))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : ServerData, args : string[]) : string[] {
    return [...data.servers]
}