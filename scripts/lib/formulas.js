const ServerBaseGrowthRate = 1.03;
const ServerMaxGrowthRate = 1.0035;


// Bitnode multipliers (Need SF5 for getBitNodeMultipliers)
const BNServerGrowthRate = 1;
const BNHackExpGain = 1;
const BNScriptHackMoney = 1;

export const HackingFormulas = {
  growPercent : (server, threads, player, cores = 1) => calculateServerGrowth(server, threads, player, cores),
  growTime : (server, player) => calculateGrowTime(server, player) * 1000,
  ehackChance : (server, player) => calculateHackingChance(server, player),
  hackExp : (server, player) => calculateHackingExpGain(server, player),
  hackPercent : (server, player) => calculatePercentMoneyHacked(server, player),
  hackTime : (server, player) => calculateHackingTime(server, player) * 1000,
  weakenTime : (server, player) => calculateWeakenTime(server, player) * 1000
};

function calculateServerGrowth(server, threads, player, cores = 1) {
    const numServerGrowthCycles = Math.max(Math.floor(threads), 0);

    //Get adjusted growth rate, which accounts for server security
    const growthRate = ServerBaseGrowthRate;
    let adjGrowthRate = 1 + (growthRate - 1) / server.hackDifficulty;
    adjGrowthRate = Math.min(adjGrowthRate, ServerMaxGrowthRate);

    //Calculate adjusted server growth rate based on parameters
    const serverGrowthPercentage = server.serverGrowth / 100;
    const numServerGrowthCyclesAdjusted =
        numServerGrowthCycles * serverGrowthPercentage * BNServerGrowthRate;

    //Apply serverGrowth for the calculated number of growth cycles
    const coreBonus = 1 + (cores - 1) / 16;
    return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * player.hacking_grow_mult * coreBonus);
}

function calculateGrowTime(server, player) {
    const growTimeMultiplier = 3.2; // Relative to hacking time. 16/5 = 3.2
  
    return growTimeMultiplier * calculateHackingTime(server, player);
}

function calculateHackingTime(server, player) {
    const difficultyMult = server.requiredHackingSkill * server.hackDifficulty;
  
    const baseDiff = 500;
    const baseSkill = 50;
    const diffFactor = 2.5;
    let skillFactor = diffFactor * difficultyMult + baseDiff;
    
    skillFactor /= player.hacking + baseSkill;
  
    const hackTimeMultiplier = 5;
    const hackingTime =
      (hackTimeMultiplier * skillFactor) /
      (player.hacking_speed_mult * calculateIntelligenceBonus(player.intelligence, 1));
  
    return hackingTime;
}

function calculateHackingChance(server, player) {
    const hackFactor = 1.75;
    const difficultyMult = (100 - server.hackDifficulty) / 100;
    const skillMult = hackFactor * player.hacking;
    const skillChance = (skillMult - server.requiredHackingSkill) / skillMult;
    const chance =
      skillChance * difficultyMult * player.hacking_chance_mult * calculateIntelligenceBonus(player.intelligence, 1);
    if (chance > 1) {
      return 1;
    }
    if (chance < 0) {
      return 0;
    }
  
    return chance;
}

function calculateHackingExpGain(server, player) {
    const baseExpGain = 3;
    const diffFactor = 0.3;
    if (server.baseDifficulty == null) {
      server.baseDifficulty = server.hackDifficulty;
    }
    let expGain = baseExpGain;
    expGain += server.baseDifficulty * player.hacking_exp_mult * diffFactor;
  
    return expGain * BNHackExpGain;
}

function calculatePercentMoneyHacked(server, player) {
  // Adjust if needed for balancing. This is the divisor for the final calculation
  const balanceFactor = 240;

  const difficultyMult = (100 - server.hackDifficulty) / 100;
  const skillMult = (player.hacking - (server.requiredHackingSkill - 1)) / player.hacking;
  const percentMoneyHacked = (difficultyMult * skillMult * player.hacking_money_mult) / balanceFactor;
  if (percentMoneyHacked < 0) {
    return 0;
  }
  if (percentMoneyHacked > 1) {
    return 1;
  }

  return percentMoneyHacked * BNScriptHackMoney;
}

function calculateWeakenTime(server, player) {
  const weakenTimeMultiplier = 4; // Relative to hacking time

  return weakenTimeMultiplier * calculateHackingTime(server, player);
}

function calculateIntelligenceBonus(intelligence, weight = 1) {
    return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
}