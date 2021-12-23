import { NS } from '../../bitburner/src/ScriptEditor/NetscriptDefinitions'
import { ServerData } from '../../types'

import { findServer, runTerminalCommand } from '../lib/helpers'

export async function main(ns : NS) : Promise<void> {
	if (ns.args.length != 1) {
		ns.tprint('ERROR: Incorrect usage of connect command. Usage: connect [ip/hostname]')
	} else {
		const connectString = await findServer(ns, ns.args[0].toString())

		if (connectString.length > 0) {
			runTerminalCommand(connectString)
		} else {
			ns.tprint(`ERROR: Host ${ns.args[0]} not found.`)
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : ServerData, args : string[]) : string[] {
	return [...data.servers]
}