import { NS } from '../NetscriptDefinitions'


const scripts = ['hwgw.js', 'contracts.js', 'watcher.js']

export async function main(ns: NS): Promise<void> {
    for(const script of scripts) ns.run(script)
} 