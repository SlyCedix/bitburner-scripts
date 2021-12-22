/** @param {NS} ns **/

import {
	findServer,
	runTerminalCommand
} from "../../scripts/lib/helpers.js";

export async function main(ns) {
	if (ns.args.length != 1) {
		ns.tprint("ERROR: Incorrect usage of connect command. Usage: backdoor [ip/hostname]");
		return;
	}

	const connectString = await findServer(ns, ns.args[0]);

	if (connectString.length > 0) {
		runTerminalCommand(connectString + '; backdoor');
	} else {
		ns.tprint(`ERROR: Host ${ns.args[0]} not found.`);
	}

}

export function autocomplete(data, args) {
	return [...data.servers];
}