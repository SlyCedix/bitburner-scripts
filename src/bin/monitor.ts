import { NS } from '@ns'
import { minimizeLogWidth, modifyLogStyle } from 'lib/DOMhelpers'
import { rankServers } from 'lib/helpers'

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')

    const formatServer = (serverName: string): string => {
        const namePadded = `║ ${serverName.padEnd(20)}`

        const moneyAvailable = ns.nFormat(ns.getServerMoneyAvailable(serverName), '0a')
        const moneyMax = ns.nFormat(ns.getServerMaxMoney(serverName), '0a')
        const moneyPadded = `${moneyAvailable}/${moneyMax} ║ `.padStart(13)

        const currSecurity = ns.nFormat(ns.getServerSecurityLevel(serverName), '0')
        const minSecurity = ns.nFormat(ns.getServerMinSecurityLevel(serverName), '0')
        const secPadded = `${currSecurity}/${minSecurity}`.padStart(7) + ' ║'

        return namePadded + moneyPadded + secPadded
    }
    const logTitle = ns.getScriptName()
    const logScript = ns.args[0] as string ?? ''

    ns.tail()

    while (true) {
        ns.clearLog()
        const hwgwLog = ns.getScriptLogs(logScript).slice(-8)
        for (const line of hwgwLog) {
            ns.print(line.slice(6, 50))
        }

        const topTen = rankServers(ns).filter(server => ns.getServerMaxMoney(server) > 0).slice(0, 10)
        ns.print('╔════════════════════════════════╦═════════╗')
        ns.print('║ hostname                 money ║     sec ║')
        ns.print('╠════════════════════════════════╬═════════╣')
        for (const server of topTen) {
            ns.print(formatServer(server))
        }
        ns.print('╚════════════════════════════════╩═════════╝')

        if (modifyLogStyle(logTitle, 'line-height', '1')) {
            minimizeLogWidth(logTitle)
        }
        await ns.sleep(1000)
    }
}