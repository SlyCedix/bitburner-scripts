import { NS } from '../../NetscriptDefinitions'
import { ServerData } from '../../types'

import { scpAll } from '/lib/helpers.js'

export async function main(ns : NS) : Promise<void>{
	await scpAll(ns, ns.args[0].toString())
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : ServerData, args : string[]) : string[] {
	return [...data.scripts]
}