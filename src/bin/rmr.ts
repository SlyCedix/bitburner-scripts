import { NS } from '../../NetscriptDefinitions'

export async function main(ns: NS): Promise<void> {
    const files = ns.ls('home', ns.args[0] as string)

    for (const file of files) ns.rm(file)
}