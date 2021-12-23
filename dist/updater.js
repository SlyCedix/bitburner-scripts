import { getText } from './lib/helpers';
const repo = 'SlyCedix/bitburner-scripts';
const branch = 'main';
const filename = '/dist/fetcher.js';
const rawURL = `https://raw.githubusercontent.com/${repo}/${branch}${filename}`;
export async function main(ns) {
    // Ensures script can be overwritten
    ns.scriptKill(filename, ns.getHostname());
    let status = await getText(rawURL);
    if (status)
        status = status.replaceAll(/(\.\.\/)(\.\.\/)*/g, '/');
    const currFile = ns.read(filename);
    if (status === currFile) {
        ns.tprint(`INFO: Tried to download ${filename}, got same file as existing...retrying`);
        ns.spawn(ns.getScriptName());
    }
    else if (status) {
        ns.tprint(`SUCCESS: Downloaded ${filename}`);
        await ns.write(filename, [status], 'w');
    }
    else {
        ns.tprint(`ERROR: Failed to download ${filename} from ${rawURL}`);
    }
    ns.run(filename);
}
