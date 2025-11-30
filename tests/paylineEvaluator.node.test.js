import test from 'node:test';
import assert from 'node:assert/strict';

import { PaylineEvaluator } from '../src/core/PaylineEvaluator.js';
import { SYMBOLS } from '../src/config/symbols.js';
import {
    wildOnlyAcrossMiddle,
    wildSubstitutesCrown,
    mixedWithNonPayingSpecials
} from './fixtures/reelResults.js';

const betAmount = 10;

const assertWinningPositions = (result) =>
    [...result.winningPositions].sort((a, b) => a.localeCompare(b));

test('wild-only paylines do not award payouts', () => {
    const evaluation = PaylineEvaluator.evaluateWins(wildOnlyAcrossMiddle, betAmount);

    assert.equal(evaluation.totalWin, 0);
    assert.equal(evaluation.winningLines.length, 0);
    assert.equal(evaluation.details.length, 0);
});

test('wilds substitute for base symbols to complete paylines', () => {
    const evaluation = PaylineEvaluator.evaluateWins(wildSubstitutesCrown, betAmount);

    // 5-of-a-kind crowns at 200x bet
    assert.equal(evaluation.totalWin, 200 * betAmount);
    assert.deepEqual(evaluation.winningLines, [0]);
    assert.deepEqual(assertWinningPositions(evaluation), [
        '0-1',
        '1-1',
        '2-1',
        '3-1',
        '4-1'
    ]);

    const detail = evaluation.details[0];
    assert.equal(detail.type, 'payline');
    assert.equal(detail.symbol, SYMBOLS.CROWN.emoji);
    assert.equal(detail.matchCount, 5);
});

test('special symbols combined with wilds still require a base symbol', () => {
    const evaluation = PaylineEvaluator.evaluateWins(mixedWithNonPayingSpecials, betAmount);

    assert.equal(evaluation.totalWin, 0);
    assert.equal(evaluation.details.length, 0);
    assert.equal(evaluation.winningLines.length, 0);
});
