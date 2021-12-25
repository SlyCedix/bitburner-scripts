import { NS } from '../../NetscriptDefinitions'
import { ServerData } from '../../types'
import { findServer, runTerminalCommand } from '/lib/helpers.js'

export async function main(ns: NS): Promise<void> {
	if (ns.args.length != 1) {
		ns.tprintf('ERROR: Incorrect usage of connect command. Usage: backdoor [ip/hostname]')
	} else {
		const connections = await findServer(ns, ns.args[0] as string)
		let connectString = 'home; '

		for (const connection of connections) {
			if (connection != 'home') connectString += `connect ${connection}; `
		}

		if (connectString.length > 0) {
			runTerminalCommand(connectString + '; backdoor')
		} else {
			ns.tprintf(`ERROR: Host ${ns.args[0]} not found.`)
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: ServerData, args: string[]): string[] {
	return [...data.servers]
}