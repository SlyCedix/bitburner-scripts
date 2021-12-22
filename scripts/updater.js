/** @param {NS} ns **/

const repo = 'SlyCedix/bitburner-scripts';
const branch = 'main';
const filename = '/scripts/fetcher.js';
const rawURL = `https://raw.githubusercontent.com/${repo}/${branch}${filename}`;

export async function main(ns) {
    ns.scriptKill(filename, ns.getHostname());
    var status = await ns.wget(rawURL, filename);
	ns.run(filename);
}