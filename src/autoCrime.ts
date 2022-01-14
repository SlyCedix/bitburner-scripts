import { NS } from '@ns'
import { createStatDisplay, deleteStatDisplay, updateStatDisplay } from 'lib/DOMhelpers'
import { getBestKarmaCrime } from 'lib/singularity'

export async function main(ns: karmaNS): Promise<void> {
    createStatDisplay('Karma', ns.ui.getTheme().combat)
    ns.atExit(() => {
        deleteStatDisplay('Karma')
    })

    while (true) {
        ns.tail()
        updateStatDisplay('Karma', ns.heart.break())
        await ns.asleep(ns.commitCrime(getBestKarmaCrime(ns, 1)))
    }
}

interface karmaNS extends NS {
    heart: {
        break: () => string
    }
}