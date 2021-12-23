import { getServersWithoutBackdoor } from '../lib/helpers';
export async function main(ns) {
    const servers = await getServersWithoutBackdoor(ns);
    if (servers.length > 0)
        ns.tprint(`INFO: These servers need to be backdoored ${servers.values}`);
    else
        ns.tprint('INFO: All rooted servers are backdoored');
}
