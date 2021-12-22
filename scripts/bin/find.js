/** @param {NS} ns **/

import {
    findServer
} from "../../scripts/lib/helpers.js";

export async function main(ns) {
    ns.tprint(await findServer(ns, ns.args[0]));
}

export function autocomplete(data, args) {
    return [...data.servers];
}