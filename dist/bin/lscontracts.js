import { getServersWithContracts } from '../lib/helpers';
export async function main(ns) {
    const servers = await getServersWithContracts(ns);
    if (servers.length > 0)
        ns.tprint(`INFO: These servers have contracts ${servers.values}`);
    else
        ns.tprint('INFO: There are no servers with contracts');
}
