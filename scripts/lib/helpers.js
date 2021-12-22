/** @param {NS} ns **/

export function deepScan(ns, start, source = "") {
    ns.disableLog('ALL');

    var hostnames = ns.scan(start).filter(name => name != source);

    var newNames = [];
    for (let hostname of hostnames) {
        var scan = deepScan(ns, hostname, start);
        newNames = newNames.concat(scan);
    }

    return hostnames.concat(newNames);
}

export function findBestServer(ns) {
    ns.disableLog('ALL');

    var hostnames = deepScan(ns, "home");
    hostnames = hostnames.filter((hostname) => ns.hasRootAccess(hostname));

    hostnames.sort((a, b) => {
        return getHackProduction(ns, b) - getHackProduction(ns, a);
    });

    return hostnames[0];
}

function getHackProduction(ns, hostname) {
    var hackProduction = ns.getServerMaxMoney(hostname) * ns.getServerGrowth(hostname);

    return hackProduction;
}

export function getNextHackingLevel(ns) {
    ns.disableLog('ALL');

    var hostnames = deepScan(ns, "home");
    hostnames = hostnames.filter((hostname) =>
        (ns.getServerRequiredHackingLevel(hostname) > ns.getHackingLevel()));
    var lowest = Number.MAX_VALUE;

    for (let i = 0; i < hostnames.length; ++i) {
        if (ns.getServerRequiredHackingLevel(hostnames[i]) < lowest) {
            lowest = ns.getServerRequiredHackingLevel(hostnames[i]);
        }
    }

    return lowest;
}

var pServLevel = 3;

export function buyServer(ns) {
    ns.disableLog('ALL');

    var pServs = ns.getPurchasedServers();
    var maxRam = Math.pow(2, pServLevel);

    var serverCost = ns.getPurchasedServerCost(maxRam);
    var moneyAvailable = ns.getServerMoneyAvailable('home');

    if (pServs.length < ns.getPurchasedServerLimit()) {
        if (serverCost < moneyAvailable) {
            var hostname = ns.purchaseServer("pserv-" + pServs.length, maxRam);
            ns.toast(`Purchased server ${hostname} with ${formatRAM(ns, maxRam)}`);
            return hostname;
        }
    } else {
        var oldServs = pServs.filter((server) => {
            return ns.getServerMaxRam(server) < maxRam;
        });

        if (oldServs.length > 0) {
            if (ns.getPurchasedServerCost(maxRam) < moneyAvailable * 0.1) {
                ns.killall(pServs[0]);
                ns.deleteServer(pServs[0]);
                let hostname = ns.purchaseServer(pServs[0], maxRam);
                ns.toast(`Upgraded server ${hostname} to ${formatRAM(ns, maxRam)}`);
                return hostname;
            }
        } else {
            pServLevel++;
        }
    }

    return false;
}

export async function scpAll(ns, source = 'home') {
    ns.disableLog('ALL');

    var hostnames = deepScan(ns, "home");

    for (let i = 0; i < hostnames.length; ++i) {
        await ns.scp(source, hostnames[i]);
    }
}

export function getPortFunctions(ns) {
    ns.disableLog('ALL');

    var portFunctions = [];

    if (ns.fileExists('BruteSSH.exe')) portFunctions.push(ns.brutessh);
    if (ns.fileExists('FTPCrack.exe')) portFunctions.push(ns.ftpcrack);
    if (ns.fileExists('relaySMTP.exe')) portFunctions.push(ns.relaysmtp);
    if (ns.fileExists('HTTPWorm.exe')) portFunctions.push(ns.httpworm);
    if (ns.fileExists('SQLInject.exe')) portFunctions.push(ns.sqlinject);

    return portFunctions;
}

export function rootAll(ns) {
    var portFunctions = getPortFunctions(ns);

    // Gets all hostnames accessible on the network
    var hostnames = deepScan(ns, "home");

    // Checks which hostnames can be rooted, but are not
    var needRoot = hostnames.filter((hostname) => {
        return !ns.hasRootAccess(hostname) &&
            (ns.getServerNumPortsRequired(hostname) <= portFunctions.length) &&
            (ns.getServerRequiredHackingLevel(hostname) <= ns.getHackingLevel());
    });

    // Roots those servers
    needRoot.forEach((hostname) => {
        portFunctions.forEach((portFunction) => {
            portFunction(hostname);
        });
        ns.nuke(hostname);
    });
}

export function getServersWithoutBackdoor(ns) {
    var hostnames = deepScan(ns, "home");
    hostnames = hostnames.filter((hostname) => {
        return (!ns.getServer(hostname).backdoorInstalled &&
            ns.hasRootAccess(hostname) &&
            !ns.getPurchasedServers().includes(hostname));
    });

    return hostnames;
}

export function getServersWithContracts(ns) {
    var hostnames = deepScan(ns, "home");
    hostnames = hostnames.filter((hostname) => {
        return ns.ls(hostname, "contract").length > 0;
    });

    return hostnames;
}

export function findServer(ns, target, start = 'home', source = '') {
    var str = "";

    var hostnames = ns.scan(start).filter((hostname) => {
        return hostname != source;
    });

    if (hostnames.includes(target)) {
        if (start != 'home') return `connect ${start}; connect ${target}`;
        return `home; connect ${target}`;
    }

    for (let i = 0; i < hostnames.length; ++i) {
        var connection = findServer(ns, target, hostnames[i], start);

        if (connection.length > 0) {
            if (start == 'home') return `home; ${connection}`;
            else return `connect ${start}; ${connection}`;
        }
    }

    return "";
}

export function runTerminalCommand(command) {
    const terminalInput = eval('document').getElementById("terminal-input");
    terminalInput.value = command;
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({
        target: terminalInput
    });
    terminalInput[handler].onKeyDown({
        keyCode: 13,
        preventDefault: () => null
    });
}

export function formatRAM(ns, n) {
    if (n < 1e3) return ns.nFormat(n, "0.00") + "GB";
    if (n < 1e6) return ns.nFormat(n / 1e3, "0.00") + "TB";
    if (n < 1e9) return ns.nFormat(n / 1e6, "0.00") + "PB";
    if (n < 1e12) return ns.nFormat(n / 1e9, "0.00") + "EB";
    return ns.nFormat(n, "0.00") + "GB";
}

export async function getURL(url, json = false) {
    var fetchHeaders = [
        ['Authorization', `token ${key}`]
    ];

    if (json) fetchHeaders.push(['Content-Type', 'application/json']);
    else fetchHeaders.push(['Content-Type', 'text/plain']);

    return fetch(url, {
        method: 'GET',
        headers: fetchHeaders
    }).then(response => {
        if (response.status === 200) {
            if (json) return response.json();
            else return response.text();
        } else {
            return false;
        }
    });
}