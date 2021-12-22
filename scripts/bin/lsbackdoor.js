import {getServersWithoutBackdoor} from "/scripts/helpers.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.tprint(await getServersWithoutBackdoor(ns));
}