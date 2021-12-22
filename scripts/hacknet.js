/** @param {NS} ns **/

const costThreshold = 50000;
export class Hacknet{
	constructor(ns) {
		ns.disableLog('ALL');
		
		this.ns = ns;
	} 

	async init() {
		this.ns.print('INFO: Hacknet initialized');
	}

	async update() {
		var maxCost = Math.min(this.totalProduction * 30,
							   this.ns.getServerMoneyAvailable('home') * 0.1);

		maxCost = Math.max(costThreshold, maxCost, this.ns.getServerMoneyAvailable('home') * 0.01);

		if (this.ns.hacknet.getPurchaseNodeCost() < maxCost || 
		this.ns.hacknet.numNodes() < this.nodeCount) {
			// Purchases new node if the target has been reached or if all nodes are maxed
			if(this.ns.hacknet.purchaseNode() != -1) {
				this.ns.toast('Hacknet: Node purchased');
			}
		}

		for (let i = 0; i < this.ns.hacknet.numNodes(); ++i) {
			if (this.ns.hacknet.getLevelUpgradeCost(i, 10) < maxCost) {
				if(this.ns.hacknet.upgradeLevel(i)) {
					this.ns.toast(`Hacknet: hacknet-node-${i} levels upgraded`);
				}
			}
			if (this.ns.hacknet.getRamUpgradeCost(i) < maxCost) {
				if(this.ns.hacknet.upgradeRam(i)) {
					this.ns.toast(`Hacknet: hacknet-node-${i} ram upgraded`);
				}
			}
			if (this.ns.hacknet.getCoreUpgradeCost(i) < maxCost) {
				if(this.ns.hacknet.upgradeCore(i)) {
					this.ns.toast(`Hacknet: hacknet-node-${i} cores upgraded`);
				}	
			}
		}
	}

	get totalProduction() {
		var sum = 0;

		for (let i = 0; i < this.ns.hacknet.numNodes(); ++i) {
			sum += this.ns.hacknet.getNodeStats(i).production;
		}

		return sum;
	}
}