export type ReelPositions = [number, number, number, number, number];

export interface WinThresholds {
    big: number;
    mega: number;
}

export interface AnimationTimings {
    symbolLanded: number;
    levelUpMessage: number;
    freeSpinDelay: number;
    screenShake: number;
    winCounterFast: number;
    winCounterNormal: number;
    winCounterStepsFast: number;
    winCounterStepsNormal: number;
    reelStopping: number;
    anticipationDisplay: number;
    anticipationHighlight: number;
}

export interface AutoplayConfig {
    normalDelay: number;
    turboDelay: number;
}

export interface GambleConfig {
    offerTimeout: number;
}

export interface AnticipationConfig {
    enabled: boolean;
    triggerChance: number;
    flukeChance: number;
    dramaticDelayHigh: number;
    dramaticDelayMedium: number;
}

export interface GameConfig {
    reelCount: number;
    rowCount: number;
    symbolsPerReel: number;
    initialCredits: number;
    betOptions: number[];
    maxBetIncrementPercent: number;
    targetRTP: number;
    volatility: string;
    winThresholds: WinThresholds;
    paylines: number[][];
    spinDurations: number[];
    reelSpinInterval: number;
    animations: AnimationTimings;
    winDisplayDuration: number;
    messageDisplayDuration: number;
    autoplay: AutoplayConfig;
    gamble: GambleConfig;
    soundTickFrequency: number;
    soundTickBaseFrequency: number;
    soundTickFrequencyStep: number;
    anticipation: AnticipationConfig;
    storageKey: string;
}

export interface FreeSpinsTriggerConfig {
    minScatters: number;
    scatterCounts: Record<string | number, number>;
}

export interface FreeSpinsConfig {
    trigger: FreeSpinsTriggerConfig;
    multipliers: number[];
    canRetrigger: boolean;
    transitionDuration: number;
    celebrationDuration: number;
}

export interface BonusGameTriggerConfig {
    minBonusSymbols: number;
}

export interface BonusPrizeConfig {
    type: 'credits' | 'multiplier' | 'extraPick';
    min?: number;
    max?: number;
    value?: number;
}

export interface BonusPickGameConfig {
    minPicks: number;
    maxPicks: number;
    prizes: BonusPrizeConfig[];
}

export interface BonusGameConfig {
    trigger: BonusGameTriggerConfig;
    pickGame: BonusPickGameConfig;
    transitionDuration: number;
    revealDelay: number;
}

export interface GambleFeatureConfig {
    maxWinAmount: number;
    maxAttempts: number;
    offerTimeout: number;
}

export interface SpinHistoryConfig {
    maxEntries: number;
}

export interface CascadeConfig {
    enabled: boolean;
    maxIterations: number;
    multipliers: number[];
    removeDelay: number;
    dropDelay: number;
    fillDelay: number;
    evaluationDelay: number;
    particleCount: number;
    particleColors: string[];
}

export interface FeaturesConfig {
    freeSpins: FreeSpinsConfig;
    bonusGame: BonusGameConfig;
    gamble: GambleFeatureConfig;
    spinHistory: SpinHistoryConfig;
    cascade: CascadeConfig;
}

export interface SymbolPayouts {
    [count: number]: number;
}

export type SymbolTier = 'premium' | 'standard' | undefined;

export interface SymbolConfig {
    emoji: string;
    type: string;
    name: string;
    description?: string;
    allowedReels?: number[];
    weight: number;
    payouts?: SymbolPayouts;
    tier?: SymbolTier;
}

export interface GameSymbolMap {
    [key: string]: SymbolConfig;
}
