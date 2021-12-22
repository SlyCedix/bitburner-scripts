/** @param {NS} ns **/

import {
	key
} from "../scripts/OAuth.js";

const repo = "SlyCedix/bitburner-scripts";
const branch = "main";
const treeURL = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;
const rawURL = `https://raw.githubusercontent.com/${repo}/${branch}`;

const treeFile = 'tree.txt';

export async function main(ns) {
	var oldTree = ns.fileExists(treeFile) ? JSON.parse(ns.read(treeFile)) : [];

	while (true) {
		let sleep = ns.asleep(10000);

		let treeFetch = (await getURL(treeURL, true)).tree;

		let toUpdate = treeFetch.filter((entry) => { // jshint ignore:line
			return entry.path.includes('.js') &&
				oldTree.filter(node => node.sha == entry.sha).length == 0;
		});

		let runUpdater = false;

		for (let treeEntry of toUpdate) {
			let path = `/${treeEntry.path}`;

			if (path == ns.getScriptName()) {
				let status = await getURL(rawURL + path);
				let currFile = ns.read(path);
				if (status === currFile) {
					ns.tprint(`INFO: Tried to download ${path}, got same file as existing`);
					treeEntry.sha = "";
				} else if (status) {
					runUpdater = true;
					ns.tprint(`SUCCESS: Downloaded ${path}`);
				} else {
					ns.tprint(`ERROR: Failed to download ${path} from ${rawURL + path}`);
				}
			} else {
				let processes = ns.ps().filter((process) => { // jshint ignore:line
					return process.filename == path;
				});

				if (processes.length > 0) {
					ns.scriptKill(path, ns.getHostname());
				}

				let status = await getURL(rawURL + path);
				status.replaceAll("/^[../][../]*/g", "/"); // Resolves relative filepaths
				let currFile = ns.read(path);

				if (status === currFile && oldTree.length > 0) {
					ns.tprint(`INFO: Tried to download ${path}, got same file as existing`);
					treeEntry.sha = "";
				} else if (status) {
					await ns.write(path, status, 'w');
					ns.tprint(`SUCCESS: Downloaded ${path}`);
				} else {
					ns.tprint(`ERROR: Failed to download ${path} from ${rawURL + path}`);
				}

				for (let process of processes) {
					ns.run(process.filename, process.threads, ...process.args);
				}
			}
		}

		if (toUpdate.length > 0) {
			await ns.write('tree.txt', JSON.stringify(treeFetch), 'w');
			oldTree = treeFetch;
		}

		if (runUpdater) {
			ns.run('/scripts/updater.js');
			return;
		}

		await ns.sleep(10);
		await sleep;
	}
}

async function getURL(url, json = false) {
	var fetchHeaders = [
		['Authorization', `token ${key}`]
	];

	if (json) fetchHeaders.push(['Content-Type', 'application/json']);
	else fetchHeaders.push(['Content-Type', 'text/plain']);

	return fetch(url, {
		method: 'GET',
		headers: fetchHeaders
	}).then(response => {
		if (response.status === 200) {
			if (json) return response.json();
			else return response.text();
		} else {
			return false;
		}
	});
}