import { NS } from '../bitburner/src/ScriptEditor/NetscriptDefinitions'

import { getJSON, getText } from './lib/helpers'

const repo = 'SlyCedix/bitburner-scripts'
const branch = 'typescript'
const treeURL = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`
const rawURL = `https://raw.githubusercontent.com/${repo}/${branch}`

const treeFile = 'tree.txt'

export async function main(ns : NS) : Promise<void> {
	let oldTree = ns.fileExists(treeFile) ? JSON.parse(ns.read(treeFile)) : {}

	while (true) {
		const sleep = ns.asleep(10000)

		const treeFetch = (await getJSON<TreeRoot>(treeURL)).tree

		const toUpdate = treeFetch.filter((entry : any) => { // jshint ignore:line
			return entry.path.includes('.js') &&
				oldTree.filter((node : any) => node.sha == entry.sha).length == 0
		})

		let runUpdater = false

		for (const treeEntry of toUpdate) {
			const path = `/${treeEntry.path}`

			if (path == ns.getScriptName()) {
				const status = await getText(rawURL + path)
				const currFile = ns.read(path)
				if (status === currFile) {
					ns.tprint(`INFO: Tried to download ${path}, got same file as existing`)
					treeEntry.sha = ''
				} else if (status) {
					runUpdater = true
					ns.tprint(`SUCCESS: Downloaded ${path}`)
				} else {
					ns.tprint(`ERROR: Failed to download ${path} from ${rawURL + path}`)
				}
			} else {
				const processes = ns.ps().filter((process) => { // jshint ignore:line
					return process.filename == path
				})

				if (processes.length > 0) {
					ns.scriptKill(path, ns.getHostname())
				}

				let status = await getText(rawURL + path)
				if(status) status = status.replaceAll(/from '(\.)*\//g, 'from \'/dist/').replaceAll(/(from '\/dist\/(\w*\/)*(\w)*)/g, '$1.js') // Resolves relative filepaths

				const currFile = ns.read(path)

				if (status === currFile && oldTree.length > 0) {
					ns.tprint(`INFO: Tried to download ${path}, got same file as existing`)
					treeEntry.sha = ''
				} else if (status) {
					await ns.write(path, [status.toString()], 'w')
					ns.tprint(`SUCCESS: Downloaded ${path}`)
				} else {
					ns.tprint(`ERROR: Failed to download ${path} from ${rawURL + path}`)
				}

				for (const process of processes) {
					ns.run(process.filename, process.threads, ...process.args)
				}
			}
		}

		if (toUpdate.length > 0) {
			await ns.write('tree.txt', [JSON.stringify(treeFetch)], 'w')
			oldTree = treeFetch
		}

		if (runUpdater) {
			ns.run('/scripts/updater.js')
			return
		}

		await ns.sleep(10)
		await sleep
	}
}

class TreeRoot {
	sha = ''
	url = ''
	tree : Array<TreeBranch> = []
	truncated = ''
}

class TreeBranch {
	path = ''
	mode = ''
	type = ''
	sha = ''
	url = ''
}