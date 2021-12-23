import { getPortFunctions, getNextHackingLevel } from './lib/helpers.js';
const hackScript = '../scripts/hwgw/hack.js';
const growScript = '../scripts/hwgw/grow.js';
const weakScript = '../scripts/hwgw/weaken.js';
export class Bot {
    ns;
    level;
    constructor(ns, level = false) {
        this.ns = ns;
        this.level = level;
    }
}
export class Botnet {
    ns;
    level;
    target = 'n00dles';
    constructor(ns, level = false) {
        this.ns = ns;
        this.level = level;
    }
    async init() {
        this.ns.disableLog('ALL');
        this.portFunctions = getPortFunctions(this.ns);
        this.nextHackingLevel = getNextHackingLevel(this.ns);
        rootAll(this.ns);
        this.setTarget(findBestServer(ns));
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
            this.nextHackingLevel = this.ns.getHackingLevel(this.ns);
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
        const boughtServer = buyServer(this.ns);
        if (boughtServer) {
            this.bots = this.bots.filter((hostname) => {
                return hostname != boughtServer;
            });
            const bot = new Bot(this.ns, this.target, boughtServer, 0, this.leveling);
            this.bots.push(bot);
            await bot.init();
        }
        for (let i = 0; i < this.bots.length; ++i) {
            await this.bots[i].update();
            await this.ns.sleep(25);
        }
        this.updateUI();
    }
    setTarget(target = 'n00dles') {
        if (this.level) {
            return false;
        }
        else if (this.ns.serverExists(target)) {
            this.target = target;
            return true;
        }
        return false;
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
