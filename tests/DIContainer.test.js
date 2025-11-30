/**
 * Unit tests for DIContainer
 *
 * Run with: node tests/DIContainer.test.js
 * (Simple test runner without external dependencies)
 */

import { DIContainer } from '../src/core/DIContainer.js';

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
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toEqual(expected) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toThrow(expectedMessage) {
            try {
                actual();
                throw new Error('Expected function to throw');
            } catch (error) {
                if (expectedMessage && !error.message.includes(expectedMessage)) {
                    throw new Error(`Expected error message to include "${expectedMessage}", got "${error.message}"`);
                }
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
    console.log('\n🧪 Running DIContainer Tests\n');

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
// Test Suite
// ============================================

test('should create empty container', () => {
    const container = new DIContainer();
    expect(container.services.size).toBe(0);
    expect(container.instances.size).toBe(0);
});

test('should register and resolve singleton', () => {
    const container = new DIContainer();

    class TestService {
        constructor() {
            this.id = Math.random();
        }
    }

    container.singleton('test', TestService);

    const instance1 = container.resolve('test');
    const instance2 = container.resolve('test');

    expect(instance1.id).toBe(instance2.id); // Same instance
});

test('should register and resolve transient', () => {
    const container = new DIContainer();

    class TestService {
        constructor() {
            this.id = Math.random();
        }
    }

    container.transient('test', TestService);

    const instance1 = container.resolve('test');
    const instance2 = container.resolve('test');

    expect(instance1.id !== instance2.id).toBeTruthy(); // Different instances
});

test('should register and resolve value', () => {
    const container = new DIContainer();
    const testValue = { foo: 'bar' };

    container.value('config', testValue);

    const resolved = container.resolve('config');
    expect(resolved).toEqual(testValue);
});

test('should auto-resolve dependencies', () => {
    const container = new DIContainer();

    class ServiceA {
        constructor() {
            this.name = 'A';
        }
    }

    class ServiceB {
        constructor(serviceA) {
            this.serviceA = serviceA;
            this.name = 'B';
        }
    }

    container.singleton('serviceA', ServiceA);
    container.singleton('serviceB', ServiceB, ['serviceA']);

    const serviceB = container.resolve('serviceB');
    expect(serviceB.name).toBe('B');
    expect(serviceB.serviceA.name).toBe('A');
});

test('should resolve nested dependencies', () => {
    const container = new DIContainer();

    class ServiceA {
        constructor() {
            this.name = 'A';
        }
    }

    class ServiceB {
        constructor(serviceA) {
            this.serviceA = serviceA;
            this.name = 'B';
        }
    }

    class ServiceC {
        constructor(serviceB) {
            this.serviceB = serviceB;
            this.name = 'C';
        }
    }

    container.singleton('serviceA', ServiceA);
    container.singleton('serviceB', ServiceB, ['serviceA']);
    container.singleton('serviceC', ServiceC, ['serviceB']);

    const serviceC = container.resolve('serviceC');
    expect(serviceC.name).toBe('C');
    expect(serviceC.serviceB.name).toBe('B');
    expect(serviceC.serviceB.serviceA.name).toBe('A');
});

test('should detect circular dependencies', () => {
    const container = new DIContainer();

    class ServiceA {
        constructor(serviceB) {
            this.serviceB = serviceB;
        }
    }

    class ServiceB {
        constructor(serviceA) {
            this.serviceA = serviceA;
        }
    }

    container.singleton('serviceA', ServiceA, ['serviceB']);
    container.singleton('serviceB', ServiceB, ['serviceA']);

    expect(() => container.resolve('serviceA')).toThrow('Circular dependency');
});

test('should throw on unregistered service', () => {
    const container = new DIContainer();

    expect(() => container.resolve('nonexistent')).toThrow('not registered');
});

test('should work with factory functions', () => {
    const container = new DIContainer();

    container.value('multiplier', 2);

    container.factory('calculator', (c) => {
        const multiplier = c.resolve('multiplier');
        return {
            multiply: (x) => x * multiplier
        };
    });

    const calc = container.resolve('calculator');
    expect(calc.multiply(5)).toBe(10);
});

test('should check if service exists', () => {
    const container = new DIContainer();

    container.value('test', 123);

    expect(container.has('test')).toBeTruthy();
    expect(container.has('nonexistent')).toBeFalsy();
});

test('should get all service names', () => {
    const container = new DIContainer();

    container.value('serviceA', 1);
    container.value('serviceB', 2);
    container.value('serviceC', 3);

    const names = container.getServiceNames();
    expect(names).toEqual(['serviceA', 'serviceB', 'serviceC']);
});

test('should clear instances', () => {
    const container = new DIContainer();

    class TestService {
        constructor() {
            this.id = Math.random();
        }
    }

    container.singleton('test', TestService);

    const instance1 = container.resolve('test');
    container.clearInstances();
    const instance2 = container.resolve('test');

    expect(instance1.id !== instance2.id).toBeTruthy(); // New instance after clear
});

test('should reset container completely', () => {
    const container = new DIContainer();

    container.value('test', 123);
    container.resolve('test');

    container.reset();

    expect(container.services.size).toBe(0);
    expect(container.instances.size).toBe(0);
});

test('should create scoped container', () => {
    const parent = new DIContainer();

    class TestService {
        constructor() {
            this.id = Math.random();
        }
    }

    parent.singleton('test', TestService);

    const scope = parent.createScope();

    const parentInstance = parent.resolve('test');
    const scopeInstance = scope.resolve('test');

    expect(parentInstance.id !== scopeInstance.id).toBeTruthy(); // Different instances
});

test('should handle factory with dependencies', () => {
    const container = new DIContainer();

    container.value('prefix', 'Hello');

    container.factory('greeter', (c) => {
        const prefix = c.resolve('prefix');
        return {
            greet: (name) => `${prefix}, ${name}!`
        };
    });

    const greeter = container.resolve('greeter');
    expect(greeter.greet('World')).toBe('Hello, World!');
});

test('should resolve complex dependency graph', () => {
    const container = new DIContainer();

    class Logger {
        log(msg) { return `LOG: ${msg}`; }
    }

    class Database {
        constructor(logger) {
            this.logger = logger;
        }
        query(sql) {
            this.logger.log(sql);
            return 'result';
        }
    }

    class UserService {
        constructor(database, logger) {
            this.database = database;
            this.logger = logger;
        }
        getUser(id) {
            this.logger.log(`Getting user ${id}`);
            return this.database.query(`SELECT * FROM users WHERE id=${id}`);
        }
    }

    container.singleton('logger', Logger);
    container.singleton('database', Database, ['logger']);
    container.singleton('userService', UserService, ['database', 'logger']);

    const userService = container.resolve('userService');
    const result = userService.getUser(123);

    expect(result).toBe('result');
    expect(userService.logger).toBeTruthy();
    expect(userService.database).toBeTruthy();
    expect(userService.database.logger).toBeTruthy();
});

test('should handle constructor with no dependencies', () => {
    const container = new DIContainer();

    class SimpleService {
        getValue() { return 42; }
    }

    container.singleton('simple', SimpleService);

    const service = container.resolve('simple');
    expect(service.getValue()).toBe(42);
});

test('should throw helpful error on resolution failure', () => {
    const container = new DIContainer();

    class FailingService {
        constructor() {
            throw new Error('Construction failed');
        }
    }

    container.singleton('failing', FailingService);

    expect(() => container.resolve('failing')).toThrow('Failed to resolve');
});

// Run all tests
runTests();
