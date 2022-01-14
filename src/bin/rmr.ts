import { NS } from '@ns'

export function main(ns: NS): void {
    ns.ls('home', ns.args[0] as string).forEach( f => ns.rm(f))
}