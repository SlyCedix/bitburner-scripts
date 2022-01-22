import { NS } from '@ns'

export interface ServerData {
    servers: string[];
    scripts: string[];
    txts: string[];
    flags: string[];
}

export interface ActionTimes {
    hack: number;
    weaken: number;
    grow: number;
}

export interface HackRatios {
    weakT: number;
    hackT: number;
    growT: number;
    weak2T: number;
}

export interface ServerPerformance {
    hostname: string;
    preformance: number;
}

export interface FactionRequirements {
    backdoor?: string;
    money?: number;
    hack_level?: number;
    location?: string[];
    hacknet_level?: number;
    hacknet_ram?: number;
    hacknet_cores?: number;
    conflicts?: string[];
    company?: CompanyFactionRequirements;
    combat_stats?: number;
    karma?: number;
    ceo?: boolean;
    kills?: number;
    company_conflicts?: string[];
    augmentations?: number;
    hack_or_combat?: boolean;
}

export interface CompanyFactionRequirements {
    name: string;
    location: string;
    rep: number;
}

export interface karmaNS extends NS {
    heart: {
        break: () => number
    }
}