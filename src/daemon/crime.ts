import { CrimeStats } from '@ns'
import { karmaNS } from '@types'
import { createStatDisplay, deleteStatDisplay, getLogElement, updateStatDisplay } from 'lib/DOMhelpers'
import { getBestCrime } from 'lib/singularity'

export async function main(ns: karmaNS): Promise<void> {
    createStatDisplay('Karma', ns.ui.getTheme().combat)
    ns.atExit(() => {
        deleteStatDisplay('Karma')
    })

    const prop = ns.args[0] as string ?? 'money'

    while (true) {
        if(getLogElement(ns.getScriptName()) == null) ns.tail()
        updateStatDisplay('Karma', Math.ceil(ns.heart.break()).toString())
        await ns.sleep(ns.commitCrime(getBestCrime(ns, prop as keyof CrimeStats)))
    }
}

