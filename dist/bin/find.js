import { findServer } from '/lib/helpers.js';
export async function main(ns) {
    ns.tprint(await findServer(ns, ns.args[0].toString()));
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data, args) {
    return [...data.servers];
}
