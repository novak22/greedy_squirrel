import test from 'node:test';
import assert from 'node:assert/strict';

import { StateManager, createInitialState } from '../src/core/StateManager.js';
import { GameState } from '../src/core/GameState.js';

test('StateManager updates notify path and parent subscribers with versioning', () => {
    const manager = new StateManager(createInitialState());
    let pathNotified = false;
    let parentNotified = false;

    manager.subscribe('game.credits', (newValue, oldValue) => {
        pathNotified = true;
        assert.equal(oldValue, 1000);
        assert.equal(newValue, 1100);
    });

    manager.subscribe('game', (newValue) => {
        parentNotified = true;
        assert.equal(newValue.credits, 1100);
    });

    const result = manager.update('game.credits', 1100);

    assert.ok(pathNotified);
    assert.ok(parentNotified);
    assert.equal(manager.getVersion(), 1);
    assert.equal(result.version, 1);
});

test('GameState enforces validation and restores checkpoints', () => {
    const manager = new StateManager(createInitialState());
    const gameState = new GameState(manager);

    const checkpoint = gameState.createCheckpoint();
    gameState.setCredits(1200);
    gameState.setLastWin(200);
    assert.equal(gameState.getCredits(), 1200);
    assert.equal(gameState.getLastWin(), 200);

    gameState.restoreCheckpoint(checkpoint);
    assert.equal(gameState.getCredits(), checkpoint.credits);
    assert.equal(gameState.getLastWin(), checkpoint.lastWin);
});

test('batchUpdate mutates multiple fields atomically and rejects invalid input', () => {
    const manager = new StateManager(createInitialState());
    const gameState = new GameState(manager);

    gameState.batchUpdate({ credits: 900, currentBet: 20, isSpinning: true });

    assert.equal(gameState.getCredits(), 900);
    assert.equal(gameState.getCurrentBet(), 20);
    assert.equal(gameState.isSpinning(), true);

    assert.throws(() => gameState.batchUpdate({ credits: -10 }), /Invalid credits/);
});
