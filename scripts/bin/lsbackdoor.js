/** @param {NS} ns **/

import {
    getServersWithoutBackdoor
} from "../../scripts/lib/helpers.js";

export async function main(ns) {
    ns.tprint(await getServersWithoutBackdoor(ns));
}