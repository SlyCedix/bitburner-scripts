import { scpAll } from '../lib/helpers';
export async function main(ns) {
    await scpAll(ns, ns.args[0].toString());
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data, args) {
    return [...data.scripts];
}
