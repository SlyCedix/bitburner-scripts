/** @param {NS} ns **/

import {
	Hacknet
} from "../scripts/hacknet.js";
import {
	Botnet
} from "../scripts/hacking.js";
import {
	Contracts
} from "../scripts/contracts.js";

export async function main(ns) {
	var botnet = new Botnet(ns, ns.args[0] == 'level');
	await botnet.init();

	var hacknet = new Hacknet(ns);
	await hacknet.init();

	var contracts = new Contracts(ns);
	await contracts.init();

	while (true) {
		let sleep = ns.asleep(5000);

		await hacknet.update();
		await botnet.update();
		await contracts.update();
		await ns.sleep(10);
		await sleep;
	}
}