/**
 * Unit test for configuration validation logging
 * Run with: node tests/ConfigValidation.test.js
 */

import { assertValidConfigs } from '../src/config/validation.js';

// Minimal test harness
const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
    tests.push({ name, fn });
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected truthy value, got ${actual}`);
            }
        }
    };
}

async function runTests() {
    console.log('\n🧪 Running Config Validation Tests\n');

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

// Tests

test('assertValidConfigs logs validation errors through Logger', () => {
    const loggedErrors = [];
    const stubLogger = {
        error: (message) => loggedErrors.push(message)
    };
    const failingValidator = () => ['Bad config value'];

    const errors = assertValidConfigs(stubLogger, failingValidator);

    expect(errors.length).toBe(1);
    expect(loggedErrors.includes('Bad config value')).toBeTruthy();
});

runTests();
