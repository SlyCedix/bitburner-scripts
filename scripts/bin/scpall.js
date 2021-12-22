/** @param {NS} ns **/

import {
	scpAll
} from "../../scripts/lib/helpers.js";

export async function main(ns) {
	await scpAll(ns, ns.args[0]);
}