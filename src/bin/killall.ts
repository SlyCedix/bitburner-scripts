import { NS } from '@ns'
import { killAll } from 'lib/helpers'

export function main(ns: NS): void {
    killAll(ns)
    ns.args.forEach(s => ns.run(s as string))
}