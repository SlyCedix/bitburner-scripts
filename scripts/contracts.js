/** @param {NS} ns **/
import { getServersWithContracts } from "/scripts/helpers.js";

export class Contracts {
	constructor(ns) {
		this.failed = [];
		this.ns = ns;
	}

	async init() {
		this.ns.disableLog("ALL");
		this.ns.print(`INFO: Contracts Initialized`);
	}

	async update() {
		var servers = getServersWithContracts(this.ns);

		for (let i = 0; i < servers.length; ++i) {
			var server = servers[i];
			var contracts = this.ns.ls(server, '.cct');

			for (let j = 0; j < contracts.length; ++j) {
				var contract = contracts[j];

				var contractType = this.ns.codingcontract.getContractType(contract, server);
				var contractData = this.ns.codingcontract.getData(contract, server);
				var numTries = this.ns.codingcontract.getNumTriesRemaining(contract, server);

				if (numTries > 2 && !this.failed.includes(contract)) {
					switch (contractType) {
						case "Find Largest Prime Factor":
							this.attemptContract(largestPrimeFactor, contract, server, contractData);
							break;
						case "Minimum Path Sum in a Triangle":
							this.attemptContract(pyramidSum, contract, server, contractData);
							break;
						case "Subarray with Maximum Sum":
							this.attemptContract(maxSubarraySum, contract, server, contractData);
							break;
						case "Find All Valid Math Expressions":
							this.attemptContract(validEquations, contract, server, contractData, true);
							break;
						case "Algorithmic Stock Trader I":
							this.attemptContract(algorithmicStockTrader1, contract, server, contractData);
							break;
						case "Algorithmic Stock Trader II":
							this.attemptContract(algorithmicStockTrader2, contract, server, contractData);
							break;
						case "Algorithmic Stock Trader III":
							this.attemptContract(algorithmicStockTrader3, contract, server, contractData);
							break;
						case "Algorithmic Stock Trader IV":
							this.attemptContract(algorithmicStockTrader4, contract, server, contractData);
							break;
						case "Total Ways to Sum":
							this.attemptContract(waysToSum, contract, server, contractData);
							break;
						case "Spiralize Matrix":
							this.attemptContract(spiralizeMatrix, contract, server, contractData, true);
							break;
						case "Generate IP Addresses":
							this.attemptContract(generateIPAddresses, contract, server, contractData, true);
							break;
						case "Unique Paths in a Grid I":
							this.attemptContract(uniquePaths1, contract, server, contractData);
							break;
						case "Unique Paths in a Grid II":
							this.attemptContract(uniquePaths2, contract, server, contractData);
							break;
						case "Sanitize Parentheses in Expression":
							this.attemptContract(sanitizeParenthesis, contract, server, contractData, true);
							break;
						case "Merge Overlapping Intervals":
							this.attemptContract(mergeOverlappingIntervals, contract, server, contractData, true);
							break;
						case "Array Jumping Game":
							this.attemptContract(arrayJumping, contract, server, contractData);
							break;
						default:
							this.failed.push(contract);
							this.ns.tprint(`ERROR: No solver for ${contractType} on ${server} found`);
							break;
					}
				}
			}
		}
	}

	attemptContract(solver, contract, server, data, format = false) {
		var solution = solver(data);
		if (format) solution = formatOutput(solution);

		if (!this.ns.codingcontract.attempt(solution, contract, server)) {
			this.failed.push(contract);
			this.ns.tprint(`ERROR: Failed ${contract} of type ${this.ns.codingcontract.getContractType(contract, server)} with solution ${solution}`);
		}
	}
}
function formatOutput(output) {
	return `[${output.toString().replaceAll(',', ', ')}]`;
}

function spiralizeMatrix(data) {
	var width = data[0].length;
	var height = data.length;

	var output = [];

	for (let i = 0; i < width; ++i) {
		output.push(data[0][i]);
	}

	if (height > 1) {
		for (let i = 1; i < height; ++i) {
			output.push(data[i][width - 1]);
		}

		for (let i = width - 2; i >= 0; --i) {
			output.push(data[height - 1][i]);
		}

		for (let i = height - 2; i >= 1; --i) {
			output.push(data[i][0]);
		}
	}

	var newdata = JSON.parse(JSON.stringify(data));
	newdata.splice(height - 1, 1);
	newdata.splice(0, 1);

	for (let i = 0; i < newdata.length; ++i) {
		newdata[i].splice(width - 1, 1);
		newdata[i].splice(0, 1);
	}

	if (newdata.length > 0 && newdata[0].length > 0) {
		output = output.concat(spiralizeMatrix(newdata));
	}

	return output;
}
function uniquePaths1(data) {
	data = new Array(data[0]).fill(new Array(data[1]).fill(0));
	return uniquePaths(data);
}

function uniquePaths2(data) {
	return uniquePaths(data);
}

function uniquePaths(data) {
	if (data.length == 1 && data[0].length == 1) return 1;
	if (data[0][0] == 1) return 0;

	var sum = 0;

	if (data.length > 1) {
		var downField = JSON.parse(JSON.stringify(data));
		downField.splice(0, 1);

		sum += uniquePaths(downField);
	}

	if (data[0].length > 1) {
		var upField = JSON.parse(JSON.stringify(data));

		for (let i = 0; i < data.length; ++i) {
			upField[i].splice(0, 1);
		}

		sum += uniquePaths(upField);
	}

	return sum;
}

function algorithmicStockTrader1(data) {
	var transactions = allTransactions(data);
	return maximizeProfit(transactions, 1);
}

function algorithmicStockTrader2(data) {
	var transactions = allTransactions(data);
	return maximizeProfit(transactions);
}

function algorithmicStockTrader3(data) {
	var transactions = allTransactions(data);
	return maximizeProfit(transactions, 2);
}

function algorithmicStockTrader4(data) {
	var transactions = allTransactions(data[1]);
	return maximizeProfit(transactions, data[0]);
}

function allTransactions(days) {
	var transactions = [];

	for (let i = 0; i < days.length; ++i) {
		for (let j = i + 1; j < days.length; ++j) {
			var profit = days[j] - days[i];
			if (profit > 0) {
				transactions.push([i, j, profit]);
			}
		}
	}

	return transactions;
}

function maximizeProfit(transactions, n = -1) {
	var maxProfit = 0;

	if (n == 0) return 0;
	if (transactions.length == 0) return 0;

	for (let i = 0; i < transactions.length; ++i) {
		var profit = transactions[i][2];
		if (profit <= 0) continue;

		var testTransactions = transactions.filter((transaction) => { // jshint ignore:line
			return transaction[0] > transactions[i][1];
		});


		if (testTransactions.length != 0) {
			if (n == -1) profit += maximizeProfit(testTransactions);
			else if (n > 1) profit += maximizeProfit(testTransactions, n - 1);
		}

		if (profit > maxProfit) maxProfit = profit;
	}

	return maxProfit;
}

function sanitizeParenthesis(data) {
	if(!Array.isArray(data)) data = [data];
	console.log(data);
	
	var valid = [];
	var invalid = [];

	for (let i = 0; i < data.length; ++i) {
		for (let j = 1; j <= data[i].length; ++j) {
			if (isParenthesis(data[i][j - 1])) {
				var newStr = data[i].slice(0, j - 1) + data[i].slice(j, data[i].length);

				if (isValidParenthesis(newStr)) valid.push(newStr);
				else invalid.push(newStr);
			}
		}
	}

	valid = valid.filter((c, idx) => {
		return valid.indexOf(c) === idx;
	});

	invalid = invalid.filter((c, idx) => {
		return invalid.indexOf(c) === idx;
	});

	if (valid.length > 0) {
		return valid;
	} else {
		return sanitizeParenthesis(invalid);
	}
}

function isValidParenthesis(checkStr) {
	var paren = 0;

	for (let i = 0; i < checkStr.length; ++i) {
		if (checkStr[i] == '(') paren++;
		else if (checkStr[i] == ')') paren--;

		if (paren < 0) return false;
	}

	return paren == 0;
}

function isParenthesis(char) {
	return char == '(' || char == ')';
}

function largestPrimeFactor(data, start = 2) {
	for (let i = start; i < Math.sqrt(data); i++) {
		if (isPrime(i) && data % i == 0) return largestPrimeFactor(data / i, i);
	}

	return data;
}

function isPrime(n) {
	if (n < 2) return false;

	for (let i = 2; i < Math.sqrt(n); ++i) {
		if (n % i == 0) return false;
	}

	return true;
}

function pyramidSum(data, sum = 0) {
	sum += data[0][0];
	if (data.length == 1) return sum;

	var leftData = JSON.parse(JSON.stringify(data));
	leftData.splice(0, 1);
	var rightData = JSON.parse(JSON.stringify(leftData));

	for (let i = 0; i < leftData.length; ++i) {
		leftData[i].splice(leftData[i].length - 1, 1);
		rightData[i].splice(0, 1);
	}

	console.log(leftData);
	console.log(leftSum);

	var leftSum = pyramidSum(leftData, sum);
	var rightSum = pyramidSum(rightData, sum);

	return Math.min(leftSum, rightSum);
}

function maxSubarraySum(data) {
	var maxSum = Number.MIN_VALUE;

	for (let i = 0; i < data.length; ++i) {
		for (let j = i; j < data.length; ++j) {
			var sum = data.slice(i, j + 1).reduce((a, b) => a + b, 0);
			if (sum > maxSum) maxSum = sum;
		}
	}

	return maxSum;
}
function validEquations(data) {
	var target = null;
	if (Array.isArray(data)) {
		target = data[1];
		data = data[0];
	}

	var equations = getAllEquations(data);

	if (target != null) {
		equations = equations.filter((equation) => {
			return eval(equation) == target; // jshint ignore:line
		});
	}

	return equations;
}

function getAllEquations(data) {
	var operators = ['+', '-', '*'];
	var equations = [];

	for (let i = 0; i < operators.length; ++i) {
		var str = data.toString();

		for (let j = 0; j < str.length - 1; ++j) {
			var isBetweenNumbers = (!isNaN(str[j]) && !isNaN(str[j + 1]));
			var isNotZero = (str[j + 1] != 0);

			var isLoneZero = false;
			if (j < str.length - 2) isLoneZero = (str[j + 1] == 0 && isNaN(str[j + 2]));

			if (isBetweenNumbers && (isLoneZero || isNotZero)) {
				var equation = str.slice(0, j + 1) + operators[i] + str.slice(j + 1, str.length);
				equations.push(equation);
			}
		}
		if (equations.length == 0) return [];
	}

	var newEquations = [];
	for (let i = 0; i < equations.length; ++i) {
		newEquations = newEquations.concat(getAllEquations(equations[i]));
	}

	equations = equations.concat(newEquations);

	equations = equations.filter((eq, idx) => {
		return equations.indexOf(eq) == idx;
	});

	return equations;
}

function waysToSum(data, max = null) {
	if (max == null) max = data - 1;
	if (data == 0) return 1;

	var sum = 0;

	for (let i = Math.min(data, max); i >= 1; --i) {
		sum += waysToSum(data - i, i);
	}

	return sum;
}

function generateIPAddresses(data) {
	var dataAddress = data.split('.');
	if (dataAddress.length == 4) return [data];
	var lastSet = dataAddress[dataAddress.length - 1];

	var addresses = [];

	for (let i = 0; i < 3; ++i) {
		var octet = lastSet.slice(0, i + 1);
		if (isValidOctet(octet)) {
			var newAddress = dataAddress.slice(0, dataAddress.length - 1).join('.');
			if (newAddress.length > 0) newAddress += '.';
			newAddress += octet + '.';
			newAddress += lastSet.slice(i + 1, lastSet.length);

			addresses.push(newAddress);
		}
	}

	addresses = addresses.filter((address) => {
		var splitAddress = address.split('.');
		var last = splitAddress[splitAddress.length - 1];

		return (last.length / (5 - splitAddress.length)) <= 3;
	});

	var validAddresses = [];

	for (let i = 0; i < addresses.length; ++i) {
		validAddresses = validAddresses.concat(generateIPAddresses(addresses[i]));
	}

	return validAddresses;
}

function isValidOctet(val) {
	return 0 < Number(val) && Number(val) < 256;
}

function mergeOverlappingIntervals(data) {
	data.sort((a,b) => a[0] - b[0]);

	var needsMerging = true;

	for(let i = 0; i < data.length - 1; ++i) {
		while(data[i][1] >= data[i + 1][0]) {
			console.log(data);
			data[i][1] = Math.max(data[i][1], data[i+1][1]);
			data.splice(i+1, 1);

			if(data.length == 1) break;
		}
	}

	return data;
}

function arrayJumping(data) {
	if(data.length == 1) return 1;

	var jumps = data[0];

	for(let i = 1; i <= jumps; ++i) {
		var jumpTest = arrayJumping(data.slice(i, data.length));
		if (jumpTest == 1) return 1;
	}

	return 0;
}