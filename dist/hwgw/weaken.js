export async function main(ns) {
    while (true) {
        await ns.sleep(Number(ns.args[1]));
        await ns.weaken(ns.args[0].toString());
    }
}