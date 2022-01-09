import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    await ns.hack(ns.args[0] as string)
}