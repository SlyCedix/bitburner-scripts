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