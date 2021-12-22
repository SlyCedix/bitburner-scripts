/** @param {NS} ns **/

import {getServersWithContracts} from "/scripts/helpers.js";

export async function main(ns) {
    ns.tprint(await getServersWithContracts(ns));
}