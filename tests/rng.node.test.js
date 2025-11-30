import test from 'node:test';
import assert from 'node:assert/strict';

import { RNG } from '../src/utils/RNG.js';
import { deterministicReelStrip } from './fixtures/reelResults.js';

function createSeededRandom(seed) {
    let value = seed % 2147483647;
    if (value <= 0) value += 2147483646;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

function withSeededMathRandom(seed, fn) {
    const originalRandom = Math.random;
    Math.random = createSeededRandom(seed);
    try {
        return fn();
    } finally {
        Math.random = originalRandom;
    }
}

test('generateWeightedSymbol is deterministic with seeded random', () => {
    const firstRun = withSeededMathRandom(123, () => [
        RNG.getWeightedSymbol(0),
        RNG.getWeightedSymbol(1),
        RNG.getWeightedSymbol(2)
    ]);

    const secondRun = withSeededMathRandom(123, () => [
        RNG.getWeightedSymbol(0),
        RNG.getWeightedSymbol(1),
        RNG.getWeightedSymbol(2)
    ]);

    assert.deepEqual(firstRun, secondRun);
});

test('generateReelStrip respects length and seed stability', () => {
    const firstStrip = withSeededMathRandom(999, () => RNG.generateReelStrip(0, 5));
    const secondStrip = withSeededMathRandom(999, () => RNG.generateReelStrip(0, 5));

    assert.equal(firstStrip.length, 5);
    assert.deepEqual(firstStrip, secondStrip);
});

test('getRandomPosition and getSymbolsAtPosition can replay deterministic strips', () => {
    const strip = deterministicReelStrip[0];

    const [firstPosition, secondPosition] = withSeededMathRandom(7, () => [
        RNG.getRandomPosition(strip.length),
        RNG.getRandomPosition(strip.length)
    ]);

    const symbolsFirst = RNG.getSymbolsAtPosition(strip, firstPosition, 2);
    const symbolsSecond = RNG.getSymbolsAtPosition(strip, secondPosition, 2);

    assert.deepEqual(symbolsFirst, [strip[firstPosition], strip[(firstPosition + 1) % strip.length]]);
    assert.deepEqual(symbolsSecond, [strip[secondPosition], strip[(secondPosition + 1) % strip.length]]);
});
