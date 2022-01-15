import { NS, CrimeStats } from '@ns'
import { createStatDisplay, deleteStatDisplay, updateStatDisplay } from 'lib/DOMhelpers'
import { getBestCrime } from 'lib/singularity'

export async function main(ns: karmaNS): Promise<void> {
    createStatDisplay('Karma', ns.ui.getTheme().combat)
    ns.atExit(() => {
        deleteStatDisplay('Karma')
    })

    const prop = ns.args[0] as string ?? 'money'

    while (true) {
        ns.tail()
        updateStatDisplay('Karma', Math.ceil(ns.heart.break()).toString())
        await ns.asleep(ns.commitCrime(getBestCrime(ns, prop as keyof CrimeStats)))
    }
}

interface karmaNS extends NS {
    heart: {
        break: () => number
    }
}