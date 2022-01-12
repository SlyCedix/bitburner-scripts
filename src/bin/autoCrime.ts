import { NS } from '@ns'
import { createStatDisplay, updateStatDisplay } from 'lib/DOMhelpers'
import { getBestKarmaCrime } from 'lib/singularity'

export async function main(ns: NS): Promise<void> {
    const hook = createStatDisplay('Karma')
    ns.atExit(() => {
        // @ts-ignore
        hook.parentElement.removeChild(hook)
    })

    ns.tail()

    while (true) {
        //@ts-expect-error ns.heart.break() is not in docs
        updateStatDisplay('Karma', ns.heart.break())
        await ns.asleep(ns.commitCrime(getBestKarmaCrime(ns, 1)))
    }
}