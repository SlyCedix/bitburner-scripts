import { NS } from '../../NetscriptDefinitions'
import { rankServers } from '/lib/helpers.js'

export async function main(ns : NS) : Promise<void> {
    const formatServer = (serverName : string) : string => {
        const namePadded = `║ ${serverName.padEnd(20)}`

        const moneyAvailable = ns.nFormat(ns.getServerMoneyAvailable(serverName), '0a')
        const moneyMax = ns.nFormat(ns.getServerMaxMoney(serverName), '0a')
        const moneyPadded = `${moneyAvailable}/${moneyMax} ║ `.padStart(13)

        const currSecurity = ns.nFormat(ns.getServerSecurityLevel(serverName), '0')
        const minSecurity = ns.nFormat(ns.getServerMinSecurityLevel(serverName), '0')
        const secPadded = `${currSecurity}/${minSecurity}`.padStart(7) + ' ║'

        return namePadded + moneyPadded + secPadded
    }
    ns.tail()

    while(true) {
        ns.clearLog()
        const topTen = rankServers(ns).filter(server => ns.getServerMaxMoney(server.hostname) > 0).slice(0,10)
        ns.print(`╔════════════════════════════════╦═════════╗`)
        ns.print('║ hostname                 money ║     sec ║')
        ns.print(`╠════════════════════════════════╬═════════╣`)
        for(const server of topTen) {
            ns.print(formatServer(server.hostname))
        }
        ns.print(`╚════════════════════════════════╩═════════╝`)
        fixLineHeight()
        await ns.sleep(1000)
    }
}

function fixLineHeight() : void {
    const doc = eval('document')

    const titleBar = doc.querySelector('[title="/bin/monitor.js "]')

    if(titleBar != null && titleBar != undefined) {
        // @ts-ignore
        const paragraphs = titleBar.parentNode.parentNode.parentNode
            .lastChild.firstChild.firstChild.childNodes

        for(const p of paragraphs) {
            const _p = p as HTMLElement
            if(_p.style.lineHeight != '1') {
                _p.style.lineHeight = '1'
            }
        }
    }

}