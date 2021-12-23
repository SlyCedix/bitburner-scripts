import { findServer, runTerminalCommand } from '../lib/helpers';
export async function main(ns) {
    if (ns.args.length != 1) {
        ns.tprint('ERROR: Incorrect usage of connect command. Usage: backdoor [ip/hostname]');
    }
    else {
        const connectString = await findServer(ns, ns.args[0].toString());
        if (connectString.length > 0) {
            runTerminalCommand(connectString + '; backdoor');
        }
        else {
            ns.tprint(`ERROR: Host ${ns.args[0]} not found.`);
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data, args) {
    return [...data.servers];
}
