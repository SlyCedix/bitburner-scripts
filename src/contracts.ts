import { NS } from '../NetscriptDefinitions'
import { getServersWithContracts } from '/lib/helpers.js'


export class Contracts {
	failed: string[]
	ns: NS

	constructor(ns: NS) {
		this.failed = []
		this.ns = ns
	}

	async init(): Promise<void> {
		this.ns.disableLog('ALL')
		this.ns.print('INFO: Contracts Initialized')
	}

	async update(): Promise<void> {
		const servers = getServersWithContracts(this.ns)

		for (let i = 0; i < servers.length; ++i) {
			const server = servers[i]
			const contracts = this.ns.ls(server, '.cct')

			for (let j = 0; j < contracts.length; ++j) {
				const contract = contracts[j]

				const contractType = this.ns.codingcontract.getContractType(contract, server)
				const contractData = this.ns.codingcontract.getData(contract, server)

				if (!this.failed.includes(contract)) {
					switch (contractType) {
						case 'Find Largest Prime Factor':
							this.attemptContract(largestPrimeFactor, contract, server, contractData)
							break
						case 'Minimum Path Sum in a Triangle':
							this.attemptContract(pyramidSum, contract, server, contractData)
							break
						case 'Subarray with Maximum Sum':
							this.attemptContract(maxSubarraySum, contract, server, contractData)
							break
						case 'Find All Valid Math Expressions':
							this.attemptContract(validEquations, contract, server, contractData, true)
							break
						case 'Algorithmic Stock Trader I':
							this.attemptContract(algorithmicStockTrader1, contract, server, contractData)
							break
						case 'Algorithmic Stock Trader II':
							this.attemptContract(algorithmicStockTrader2, contract, server, contractData)
							break
						case 'Algorithmic Stock Trader III':
							this.attemptContract(algorithmicStockTrader3, contract, server, contractData)
							break
						case 'Algorithmic Stock Trader IV':
							this.attemptContract(algorithmicStockTrader4, contract, server, contractData)
							break
						case 'Total Ways to Sum':
							this.attemptContract(waysToSum, contract, server, contractData)
							break
						case 'Spiralize Matrix':
							this.attemptContract(spiralizeMatrix, contract, server, contractData, true)
							break
						case 'Generate IP Addresses':
							this.attemptContract(generateIPAddresses, contract, server, contractData, true)
							break
						case 'Unique Paths in a Grid I':
							this.attemptContract(uniquePaths1, contract, server, contractData)
							break
						case 'Unique Paths in a Grid II':
							this.attemptContract(uniquePaths2, contract, server, contractData)
							break
						case 'Sanitize Parentheses in Expression':
							this.attemptContract(sanitizeParenthesis, contract, server, contractData, true)
							break
						case 'Merge Overlapping Intervals':
							this.attemptContract(mergeOverlappingIntervals, contract, server, contractData)
							break
						case 'Array Jumping Game':
							this.attemptContract(arrayJumping, contract, server, contractData)
							break
						default:
							this.failed.push(contract)
							this.ns.tprint(`ERROR: No solver for ${contractType} on ${server} found`)
							break
					}
				}
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-types
	attemptContract(solver: Function, contract: string, server: string, data: Array<any>, format = false): void {
		let solution = solver(data)
		if (format) solution = formatOutput(solution)

		if (!this.ns.codingcontract.attempt(solution, contract, server)) {
			this.failed.push(contract)
			this.ns.tprint(`ERROR: Failed ${contract} of type ${this.ns.codingcontract.getContractType(contract, server)} with solution ${solution}`)
		}
	}
}

function formatOutput(output: any): string {
	return `[${output.toString().replaceAll(',', ', ')}]`
}

function spiralizeMatrix(data: Array<Array<number>>): Array<number> {
	const width = data[0].length
	const height = data.length

	console.log(data)

	let output = []

	for (let i = 0; i < width; ++i) {
		output.push(data[0][i])
	}

	if (height > 1) {
		for (let i = 1; i < height; ++i) {
			output.push(data[i][width - 1])
		}
		if (width > 1) {
			for (let i = width - 2; i >= 0; --i) {
				output.push(data[height - 1][i])
			}

			for (let i = height - 2; i >= 1; --i) {
				output.push(data[i][0])
			}
		}
	}

	const newdata = JSON.parse(JSON.stringify(data))
	newdata.splice(height - 1, 1)
	newdata.splice(0, 1)

	for (let i = 0; i < newdata.length; ++i) {
		newdata[i].splice(width - 1, 1)
		newdata[i].splice(0, 1)
	}

	if (newdata.length > 0 && newdata[0].length > 0) {
		output = output.concat(spiralizeMatrix(newdata))
	}

	return output
}

function uniquePaths1(data: Array<number>): number {
	const newData = new Array(data[0]).fill(new Array(data[1]).fill(0))
	return uniquePaths(newData)
}

function uniquePaths2(data: Array<Array<number>>): number {
	return uniquePaths(data)
}

function uniquePaths(data: Array<Array<number>>): number {
	if (data.length == 1 && data[0].length == 1) return 1
	if (data[0][0] == 1) return 0

	let sum = 0

	if (data.length > 1) {
		const downField = JSON.parse(JSON.stringify(data))
		downField.splice(0, 1)

		sum += uniquePaths(downField)
	}

	if (data[0].length > 1) {
		const upField = JSON.parse(JSON.stringify(data))

		for (let i = 0; i < data.length; ++i) {
			upField[i].splice(0, 1)
		}

		sum += uniquePaths(upField)
	}

	return sum
}

function algorithmicStockTrader1(data: Array<number>): number {
	const transactions = allTransactions(data)
	return maximizeProfit(transactions, 1)
}

function algorithmicStockTrader2(data: Array<number>): number {
	const transactions = allTransactions(data)
	return maximizeProfit(transactions)
}

function algorithmicStockTrader3(data: Array<number>): number {
	const transactions = allTransactions(data)
	return maximizeProfit(transactions, 2)
}

function algorithmicStockTrader4(data: Array<any>): number {
	const transactions = allTransactions(data[1])
	return maximizeProfit(transactions, data[0])
}

function allTransactions(days: Array<number>): Array<Array<number>> {
	const transactions = []

	for (let i = 0; i < days.length; ++i) {
		for (let j = i + 1; j < days.length; ++j) {
			const profit = days[j] - days[i]
			if (profit > 0) {
				transactions.push([i, j, profit])
			}
		}
	}

	return transactions
}

function maximizeProfit(transactions: Array<any>, n = -1): number {
	let maxProfit = 0

	if (n == 0) return 0
	if (transactions.length == 0) return 0

	for (let i = 0; i < transactions.length; ++i) {
		let profit = transactions[i][2]
		if (profit <= 0) continue

		const testTransactions = transactions.filter((transaction) => {
			return transaction[0] > transactions[i][1]
		})


		if (testTransactions.length != 0) {
			if (n == -1) profit += maximizeProfit(testTransactions)
			else if (n > 1) profit += maximizeProfit(testTransactions, n - 1)
		}

		if (profit > maxProfit) maxProfit = profit
	}

	return maxProfit
}

function sanitizeParenthesis(data: string | string[]): string[] {
	if (!Array.isArray(data)) data = [data]
	console.log(data)

	let valid: string[] = []
	let invalid: string[] = []

	for (let i = 0; i < data.length; ++i) {
		for (let j = 1; j <= data[i].length; ++j) {
			if (isParenthesis(data[i][j - 1])) {
				const newStr = data[i].slice(0, j - 1) + data[i].slice(j, data[i].length)

				if (isValidParenthesis(newStr)) valid.push(newStr)
				else invalid.push(newStr)
			}
		}
	}

	valid = valid.filter((c, idx) => {
		return valid.indexOf(c) === idx
	})

	invalid = invalid.filter((c, idx) => {
		return invalid.indexOf(c) === idx
	})

	if (valid.length > 0) {
		return valid
	} else {
		return sanitizeParenthesis(invalid)
	}
}

function isValidParenthesis(checkStr: string): boolean {
	let paren = 0

	for (let i = 0; i < checkStr.length; ++i) {
		if (checkStr[i] == '(') paren++
		else if (checkStr[i] == ')') paren--

		if (paren < 0) return false
	}

	return paren == 0
}

function isParenthesis(char: string): boolean {
	return char == '(' || char == ')'
}

function largestPrimeFactor(data: number, start = 2): number {
	for (let i = start; i < Math.sqrt(data); i++) {
		if (isPrime(i) && data % i == 0) return largestPrimeFactor(data / i, i)
	}

	return data
}

function isPrime(n: number): boolean {
	if (n < 2) return false

	for (let i = 2; i < Math.sqrt(n); ++i) {
		if (n % i == 0) return false
	}

	return true
}

function pyramidSum(data: Array<Array<number>>, sum = 0): number {
	sum += data[0][0]
	if (data.length == 1) return sum

	const leftData = JSON.parse(JSON.stringify(data))
	leftData.splice(0, 1)
	const rightData = JSON.parse(JSON.stringify(leftData))

	for (let i = 0; i < leftData.length; ++i) {
		leftData[i].splice(leftData[i].length - 1, 1)
		rightData[i].splice(0, 1)
	}

	const leftSum = pyramidSum(leftData, sum)
	const rightSum = pyramidSum(rightData, sum)

	return Math.min(leftSum, rightSum)
}

function maxSubarraySum(data: Array<number>): number {
	let maxSum = Number.MIN_VALUE

	for (let i = 0; i < data.length; ++i) {
		for (let j = i; j < data.length; ++j) {
			const sum = data.slice(i, j + 1).reduce((a, b) => a + b, 0)
			if (sum > maxSum) maxSum = sum
		}
	}

	return maxSum
}

function validEquations(data: Array<any>): string[] {
	const target: number = data[1]
	const newData: string = data[0]

	let equations = getAllEquations(newData)

	if (target != null) {
		equations = equations.filter((equation) => {
			try {
				return eval(equation) == target
			} catch (e) {
				return false
			}
		})
	}

	return equations
}

function getAllEquations(data: string | string[]): string[] {
	const operators = ['+', '-', '*']
	let equations = []

	if (!Array.isArray(data)) data = [data]

	for (const equation of data) {
		let start = 0
		for (let i = 0; i < equation.length - 1; ++i) {
			if (operators.includes(equation[i])) start = i
		}

		for (let i = start; i < equation.length - 1; ++i) {
			const isBetweenNumbers = (!isNaN(Number(equation[i])) && !isNaN(Number(equation[i + 1])))

			if (isBetweenNumbers) {
				for (const operator of operators) {
					const newEquation = equation.slice(0, i + 1) + operator + equation.slice(i + 1, equation.length)
					equations.push(newEquation)
				}
			}
		}
	}

	if (equations.length == 0) return []

	equations = equations.concat(getAllEquations(equations))

	console.log(equations)
	return equations
}

function waysToSum(data: number, max = -1): number {
	if (max == -1) max = data - 1
	if (data == 0) return 1

	let sum = 0

	for (let i = Math.min(data, max); i >= 1; --i) {
		sum += waysToSum(data - i, i)
	}

	return sum
}

function generateIPAddresses(data: string): string[] {
	const dataAddress = data.split('.')
	if (dataAddress.length == 4) return [data]
	const lastSet = dataAddress[dataAddress.length - 1]

	let addresses = []

	for (let i = 0; i < 3; ++i) {
		const octet = lastSet.slice(0, i + 1)
		if (isValidOctet(octet)) {
			let newAddress = dataAddress.slice(0, dataAddress.length - 1).join('.')
			if (newAddress.length > 0) newAddress += '.'
			newAddress += octet + '.'
			newAddress += lastSet.slice(i + 1, lastSet.length)

			addresses.push(newAddress)
		}
	}

	addresses = addresses.filter((address) => {
		const splitAddress = address.split('.')
		const last = splitAddress[splitAddress.length - 1]

		return (last.length / (5 - splitAddress.length)) <= 3
	})

	let validAddresses: string[] = []

	for (let i = 0; i < addresses.length; ++i) {
		validAddresses = validAddresses.concat(generateIPAddresses(addresses[i]))
	}

	return validAddresses
}

function isValidOctet(val: string): boolean {
	return Number(val) > 0 && Number(val) < 256
}

function mergeOverlappingIntervals(data: number[][]): number[][] {
	data.sort((a, b) => a[0] - b[0])

	for (let i = 0; i < data.length - 1; ++i) {
		console.log(data)
		while (data[i][1] >= data[i + 1][0]) {
			console.log(data)
			data[i][1] = Math.max(data[i][1], data[i + 1][1])
			data.splice(i + 1, 1)

			if (i >= data.length - 1) break
		}
	}

	return data
}

function arrayJumping(data: number[]): number {
	if (data.length == 1) return 1

	const jumps = data[0]

	for (let i = jumps; i >= 1; --i) {
		const jumpTest = arrayJumping(data.slice(i, data.length))
		if (jumpTest == 1) return 1
	}

	return 0
}