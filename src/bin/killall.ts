import { NS } from '@ns'
import { killAll } from 'lib/helpers'

export async function main(ns: NS): Promise<void> {
    killAll(ns)
}