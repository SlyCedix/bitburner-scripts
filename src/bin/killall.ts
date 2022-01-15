import { NS } from '@ns'
import { killAll } from 'lib/helpers'

export function main(ns: NS): void {
    killAll(ns)

    if(ns.args[0] != undefined) {
        ns.spawn(ns.args[0] as string)
    }
}