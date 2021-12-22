/** @param {NS} ns **/

import {
    getServersWithContracts
} from "../../scripts/lib/helpers.js";

export async function main(ns) {
    ns.tprint(await getServersWithContracts(ns));
}