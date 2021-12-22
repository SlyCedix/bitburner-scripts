/** @param {NS} ns **/

import {
    getURL
} from "../scripts/lib/helpers.js";

const repo = 'SlyCedix/bitburner-scripts';
const branch = 'main';
const filename = '../scripts/fetcher.js';
const rawURL = `https://raw.githubusercontent.com/${repo}/${branch}${filename}`;

export async function main(ns) {
    ns.scriptKill(filename, ns.getHostname());
    var status = await getURL(rawURL);

    if (status) status = status.replaceAll(/(\.\.\/)(\.\.\/)*/g, "/"); // Resolves relative filepaths
    let currFile = ns.read(path);
    if (status === currFile) {
        ns.tprint(`INFO: Tried to download ${filename}, got same file as existing...retrying`);
        ns.spawn(ns.getScriptName());
    } else if (status) {
        ns.tprint(`SUCCESS: Downloaded ${filename}`);
        await ns.write(filename, status, 'w');
    } else {
        ns.tprint(`ERROR: Failed to download ${filename} from ${rawURL}`);
    }
    ns.run(filename);
}