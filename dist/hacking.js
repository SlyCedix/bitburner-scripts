/** @param {NS} ns **/
import { findBestServer, buyServer, deepScan, rootAll, getPortFunctions, getNextHackingLevel } from '/lib/helpers.js';
const weakenScript = '/scripts/hacking/weaken.script';
const growScript = '/scripts/hacking/grow.script';
const hackScript = '/scripts/hacking/hack.script';
const bbBaseGrowth = 1.03;
const bbMaxGrowth = 1.0035;
const fundPct = 0.9;
class Bot {
    ns;
    target;
    server;
    buffer;
    weakenOnly;
    reqHackSkill;
    hackDiff;
    weakenRam;
    growRam;
    hackRam;
    constructor(ns, target, server, buffer = 0.0, weakenOnly = false) {
        ns.disableLog('ALL');
        this.ns = ns;
        this.target = target;
        this.server = server;
        this.buffer = buffer;
        this.weakenOnly = weakenOnly;
        if (ns.getServerMaxMoney(server) > 0) {
            this.target = server;
            this.weakenOnly = false;
        }
        this.reqHackSkill = ns.getServerRequiredHackingLevel(target);
        this.hackDiff = ns.getServerMinSecurityLevel(target);
        this.weakenRam = ns.getScriptRam(weakenScript);
        this.growRam = ns.getScriptRam(growScript);
        this.hackRam = ns.getScriptRam(hackScript);
    }
    async init() {
        const files = [weakenScript, growScript, hackScript];
        await this.ns.scp(files, 'home', this.server);
        this.ns.print(`INFO: Bot initialized (${this.server} attacking ${this.target})`);
    }
    async update() {
        const totalRam = this.ns.getServerRam(this.server);
        const freeRam = totalRam[0] - totalRam[1] - this.buffer;
        const maxWeaken = Math.floor(freeRam / this.weakenRam);
        let hackT;
        let weakenT;
        let growT;
        let usedRam;
        switch (this.status) {
            case 0:
                this.runScript(weakenScript, maxWeaken);
                break;
            case 1:
                weakenT = Math.floor(maxWeaken * 0.08);
                growT = maxWeaken - weakenT;
                this.runScript(weakenScript, weakenT);
                this.runScript(growScript, growT);
                break;
            case 2:
                hackT = Math.floor(fundPct / this.hackPct);
                growT = Math.ceil(Math.log(1 / (1 - fundPct)) / Math.log(this.growPct)); // jshint ignore:line
                weakenT = Math.ceil(((hackT * 0.002) + (growT * 0.004)) / 0.05); // jshint ignore:line
                usedRam = Math.ceil(hackT * this.hackRam + growT * this.growRam + weakenT * this.weakenRam);
                if (usedRam > freeRam) {
                    const scaleFactor = freeRam / freeRam;
                    hackT = Math.floor(hackT * scaleFactor);
                    growT = Math.floor(growT * scaleFactor);
                    weakenT = Math.floor(weakenT * scaleFactor);
                }
                this.runScript(weakenScript, weakenT);
                this.runScript(growScript, growT);
                this.runScript(hackScript, hackT);
                break;
            default:
                this.ns.print(`ERROR: Invalid target server ${this.target}`);
        }
    }
    get hackPct() {
        const hackSkill = this.ns.getHackingLevel();
        const hackMults = this.ns.getHackingMultipliers();
        let hackPct = (100 - this.hackDiff) / 100;
        hackPct *= (1 + hackSkill - this.reqHackSkill) / hackSkill;
        hackPct *= hackMults.money;
        hackPct /= 240;
        return hackPct;
    }
    get growPct() {
        const growRate = Math.min((1 + ((bbBaseGrowth - 1) / this.hackDiff)), bbMaxGrowth);
        const hackMults = this.ns.getHackingMultipliers();
        const serverGrowth = this.ns.getServerGrowth(this.server);
        let growPct = serverGrowth / 100;
        growPct *= hackMults.growth;
        growPct = Math.pow(growRate, growPct);
        return growPct;
    }
    get status() {
        if (this.ns.getServerMaxMoney(this.target) == 0) {
            return -1;
        }
        if (this.ns.getServerMinSecurityLevel(this.target) > this.ns.getServerSecurityLevel(this.target) + 2 ||
            this.weakenOnly) {
            return 0;
        }
        if (this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target) * 0.90) {
            return 1;
        }
        return 2;
    }
    runScript(script, threadCount) {
        const totalRam = this.ns.getServerRam(this.server);
        const freeRam = totalRam[0] - totalRam[1];
        if (threadCount > 0 && this.ns.getScriptRam(script) * threadCount <= freeRam) {
            let n = 0;
            while (!this.ns.exec(script, this.server, threadCount, this.target, n)) {
                n++;
            }
            this.ns.print(`INFO: Bot executing ${script} on ${this.target} (t=${threadCount}) on ${this.server}`);
        }
    }
}
export class Botnet {
    ns;
    leveling;
    portFunctions = [];
    nextHackingLevel = 0;
    target = '';
    servers = [];
    bots = [];
    constructor(ns, leveling = false) {
        this.ns = ns;
        this.leveling = leveling;
    }
    async init() {
        this.ns.disableLog('ALL');
        this.portFunctions = getPortFunctions(this.ns);
        this.nextHackingLevel = getNextHackingLevel(this.ns);
        rootAll(this.ns);
        if (this.leveling) {
            this.target = 'joesguns';
        }
        else {
            this.target = findBestServer(this.ns);
        }
        this.servers = (deepScan(this.ns, this.ns.getHostname())).filter((hostname) => {
            return this.ns.hasRootAccess(hostname);
        });
        this.bots = [];
        for (let i = 0; i < this.servers.length; ++i) {
            if (this.servers[i] != 'home')
                this.ns.killall(this.servers[i]);
            const bot = new Bot(this.ns, this.target, this.servers[i], 0, this.leveling);
            this.bots.push(bot);
            await bot.init();
            await this.ns.sleep(25);
        }
        this.servers.push('home');
        const bot = new Bot(this.ns, this.target, 'home', 8, this.leveling);
        this.bots.push(bot);
        await bot.init();
        this.ns.print(`INFO: Botnet initialized (attacking ${this.target})`);
        this.initUI();
    }
    async update() {
        const newPortFunctions = getPortFunctions(this.ns);
        if (newPortFunctions.length > this.portFunctions.length ||
            this.ns.getHackingLevel() > this.nextHackingLevel) {
            this.portFunctions = newPortFunctions;
            this.nextHackingLevel = this.ns.getHackingLevel();
            rootAll(this.ns);
        }
        if (!this.leveling) {
            const newBest = findBestServer(this.ns);
            if (newBest != this.target) {
                this.target = newBest;
                this.bots.forEach((bot) => {
                    if (bot.target != bot.server) {
                        if (bot.server != 'home')
                            this.ns.killall(bot.server);
                        bot.target = newBest;
                    }
                });
            }
        }
        buyServer(this.ns);
        for (let i = 0; i < this.bots.length; ++i) {
            await this.bots[i].update();
            await this.ns.sleep(25);
        }
        this.updateUI();
    }
    initUI() {
        this.createDisplay('Security');
        this.createDisplay('Money');
        this.createDisplay('Target');
    }
    updateUI() {
        const moneyAvailable = this.ns.getServerMoneyAvailable(this.target);
        const securityLevel = this.ns.getServerSecurityLevel(this.target);
        const doc = eval('document');
        doc.getElementById('Target-hook-1').innerHTML = this.target;
        doc.getElementById('Money-hook-1').innerHTML = this.ns.nFormat(moneyAvailable, '$0.0a');
        doc.getElementById('Security-hook-1').innerHTML = this.ns.nFormat(securityLevel, '0.0');
    }
    createDisplay(name) {
        const doc = eval('document');
        const display = doc.getElementById(name + '-hook-0');
        if (typeof (display) == 'undefined' || display == null) {
            const extraHookRow = doc.getElementById('overview-extra-hook-0').parentElement.parentElement;
            const clonedRow = extraHookRow.cloneNode(true);
            clonedRow.childNodes[0].childNodes[0].id = name + '-hook-0';
            clonedRow.childNodes[0].childNodes[0].innerHTML = name;
            clonedRow.childNodes[1].childNodes[0].id = name + '-hook-1';
            clonedRow.childNodes[2].childNodes[0].id = name + '-hook-2';
            extraHookRow.parentNode.insertBefore(clonedRow, extraHookRow.nextSibling);
        }
    }
}
