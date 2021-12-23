import { Hacknet } from './hacknet';
import { Botnet } from './hacking';
import { Contracts } from './contracts';
export async function main(ns) {
    const botnet = new Botnet(ns, ns.args[0] == 'level');
    await botnet.init();
    const hacknet = new Hacknet(ns);
    await hacknet.init();
    const contracts = new Contracts(ns);
    await contracts.init();
    while (true) {
        const sleep = ns.asleep(5000);
        await hacknet.update();
        await botnet.update();
        await contracts.update();
        await ns.sleep(10);
        await sleep;
    }
}
