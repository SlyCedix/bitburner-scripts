import {scpAll} from "/scripts/helpers.js";

/** @param {NS} ns **/
export async function main(ns) {
	await scpAll(ns, ns.args[0]);
}