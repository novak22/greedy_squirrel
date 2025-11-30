/**
 * Integration tests for Dependency Injection
 *
 * Tests that migrated features work correctly with DI container
 * Run with: node tests/DI.integration.test.js
 */

import { GameFactory } from '../src/core/GameFactory.js';
import { TurboMode } from '../src/features/TurboMode.js';
import { Autoplay } from '../src/features/Autoplay.js';

// Simple test framework
const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
    tests.push({ name, fn });
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(
                    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
                );
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected truthy value, got ${actual}`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected falsy value, got ${actual}`);
            }
        }
    };
}

async function runTests() {
    console.log('\n🧪 Running DI Integration Tests\n');

    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log(`✅ ${name}`);
            results.passed++;
        } catch (error) {
            console.log(`❌ ${name}`);
            console.log(`   ${error.message}\n`);
            results.failed++;
        }
    }

    console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed\n`);
    process.exit(results.failed > 0 ? 1 : 0);
}

// ============================================
// Integration Tests
// ============================================

test('should create container with all services registered', () => {
    const container = GameFactory.createContainer();

    expect(container.has('eventBus')).toBeTruthy();
    expect(container.has('gameState')).toBeTruthy();
    expect(container.has('timerManager')).toBeTruthy();
    expect(container.has('turboMode')).toBeTruthy();
    expect(container.has('autoplay')).toBeTruthy();
});

test('should resolve TurboMode with dependencies', () => {
    const container = GameFactory.createContainer();
    container.value('dom', { turboBtn: null });

    const turboMode = container.resolve('turboMode');

    expect(turboMode.eventBus).toBeTruthy();
    expect(turboMode.dom).toBeTruthy();
    expect(turboMode.game).toBeFalsy(); // Should not have game ref
});

test('should resolve Autoplay with all dependencies', () => {
    const container = GameFactory.createContainer();
    container.value('dom', {});

    const autoplay = container.resolve('autoplay');

    expect(autoplay.timerManager).toBeTruthy();
    expect(autoplay.gameState).toBeTruthy();
    expect(autoplay.eventBus).toBeTruthy();
    expect(autoplay.turboMode).toBeTruthy();
    expect(autoplay.game).toBeFalsy(); // Should not have game ref
});

test('should emit events when TurboMode toggles', () => {
    const container = GameFactory.createContainer();

    const events = [];
    const mockEventBus = {
        emit: (event, data) => events.push({ event, data })
    };

    container.value('eventBus', mockEventBus);
    container.value('dom', {});

    const turboMode = container.resolve('turboMode');
    turboMode.toggle();

    expect(events.length > 0).toBeTruthy();
    const messageEvent = events.find((e) => e.event === 'message:show');
    expect(messageEvent).toBeTruthy();
});

test('should work with new DI API (TurboMode)', () => {
    const mockEventBus = { emit: () => {} };
    const mockDom = {};

    const turboMode = new TurboMode({
        eventBus: mockEventBus,
        dom: mockDom
    });

    expect(turboMode.eventBus).toBeTruthy();
    expect(turboMode.dom).toBeTruthy();
    expect(turboMode.game).toBeFalsy();
});

test('should work with backward compatible API (Autoplay)', () => {
    const mockGame = {
        state: {
            getCredits: () => 1000,
            getCurrentBet: () => 10
        },
        cleanupTimers: () => {},
        showMessage: () => {}
    };

    const mockTimerManager = {
        setTimeout: () => {},
        onClear: () => {}
    };

    const autoplay = new Autoplay(mockGame, mockTimerManager);

    expect(autoplay.game).toBeTruthy();
    expect(autoplay.timerManager).toBeTruthy();
});

test('should work with new DI API (Autoplay)', () => {
    const mockTimerManager = {
        setTimeout: () => {},
        onClear: () => {}
    };

    const mockGameState = {
        getCredits: () => 1000,
        getCurrentBet: () => 10
    };

    const mockEventBus = { emit: () => {} };

    const mockTurboMode = { isActive: false };

    const autoplay = new Autoplay({
        timerManager: mockTimerManager,
        gameState: mockGameState,
        eventBus: mockEventBus,
        turboMode: mockTurboMode
    });

    expect(autoplay.timerManager).toBeTruthy();
    expect(autoplay.gameState).toBeTruthy();
    expect(autoplay.eventBus).toBeTruthy();
    expect(autoplay.turboMode).toBeTruthy();
    expect(autoplay.game).toBeFalsy();
});

test('should share singletons across resolutions', () => {
    const container = GameFactory.createContainer();

    const eventBus1 = container.resolve('eventBus');
    const eventBus2 = container.resolve('eventBus');

    expect(eventBus1 === eventBus2).toBeTruthy(); // Same instance
});

test('should create testing container with mocks', () => {
    const mockEventBus = { emit: () => 'mocked' };

    const { container } = GameFactory.createForTesting({
        eventBus: mockEventBus
    });

    const resolved = container.resolve('eventBus');
    expect(resolved.emit()).toBe('mocked');
});

test('should resolve complex dependency chain', () => {
    const container = GameFactory.createContainer();
    container.value('dom', {});

    // Autoplay depends on: timerManager, gameState, eventBus, turboMode
    // TurboMode depends on: eventBus, dom
    // GameState depends on: stateManager
    const autoplay = container.resolve('autoplay');

    expect(autoplay.timerManager).toBeTruthy();
    expect(autoplay.gameState).toBeTruthy();
    expect(autoplay.eventBus).toBeTruthy();
    expect(autoplay.turboMode).toBeTruthy();
    expect(autoplay.turboMode.eventBus).toBeTruthy();
    expect(autoplay.turboMode.dom).toBeTruthy();
});

// Run all tests
runTests();
