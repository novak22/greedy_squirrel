import type { ReelPositions } from './config.js';

export interface FeatureFreeSpinsState {
    active: boolean;
    remaining: number;
    total: number;
    multiplier: number;
    totalWins: number;
}

export interface FeatureBonusState {
    active: boolean;
    picks: number;
    totalWin: number;
}

export interface FeatureCascadeState {
    enabled: boolean;
    count: number;
    multiplier: number;
    totalWins: number;
}

export interface FeatureGambleState {
    active: boolean;
    autoCollect: boolean;
}

export interface FeaturesState {
    freeSpins: FeatureFreeSpinsState;
    bonus: FeatureBonusState;
    cascade: FeatureCascadeState;
    gamble: FeatureGambleState;
}

export interface UiState {
    reelResult: string[][];
    winningPositions: Set<string>;
    winningLines: number[];
    showPaytable: boolean;
    showStats: boolean;
}

export interface ControlsState {
    turboMode: boolean;
    autoplay: boolean;
}

export interface GameCoreState {
    credits: number;
    currentBet: number;
    currentBetIndex: number;
    lastWin: number;
    isSpinning: boolean;
    reelPositions: ReelPositions;
}

export interface GameStateModel {
    game: GameCoreState;
    features: FeaturesState;
    ui: UiState;
    controls: ControlsState;
}
