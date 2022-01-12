import { NS } from '@ns'
import { scpAll } from 'lib/helpers'
import { ServerData } from '../../types'

export async function main(ns: NS): Promise<void> {
    await scpAll(ns, ns.args[0] as string)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: ServerData, args: string[]): string[] {
    return [...data.scripts]
}