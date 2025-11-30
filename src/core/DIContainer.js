/**
 * DIContainer - Lightweight Dependency Injection Container
 *
 * Features:
 * - Service registration with lifecycle management (singleton/transient)
 * - Auto-resolution of constructor dependencies
 * - Factory functions for complex initialization
 * - Circular dependency detection
 * - Clear error messages
 *
 * Usage:
 *   const container = new DIContainer();
 *
 *   // Register singleton
 *   container.singleton('eventBus', EventBus);
 *
 *   // Register with dependencies
 *   container.singleton('stateManager', StateManager, ['initialState']);
 *
 *   // Register with factory
 *   container.singleton('config', () => GAME_CONFIG);
 *
 *   // Resolve
 *   const eventBus = container.resolve('eventBus');
 */

export class DIContainer {
    constructor() {
        this.services = new Map();
        this.instances = new Map();
        this.resolving = new Set(); // For circular dependency detection
    }

    /**
     * Register a singleton service (created once, reused)
     * @param {string} name - Service identifier
     * @param {Function|*} factory - Class constructor or factory function
     * @param {Array<string>} deps - Dependency names to inject
     */
    singleton(name, factory, deps = []) {
        this.services.set(name, {
            factory,
            deps,
            lifecycle: 'singleton'
        });
    }

    /**
     * Register a transient service (new instance each time)
     * @param {string} name - Service identifier
     * @param {Function} factory - Class constructor or factory function
     * @param {Array<string>} deps - Dependency names to inject
     */
    transient(name, factory, deps = []) {
        this.services.set(name, {
            factory,
            deps,
            lifecycle: 'transient'
        });
    }

    /**
     * Register a value directly (no factory needed)
     * @param {string} name - Service identifier
     * @param {*} value - Value to register
     */
    value(name, value) {
        this.instances.set(name, value);
        this.services.set(name, {
            factory: () => value,
            deps: [],
            lifecycle: 'singleton'
        });
    }

    /**
     * Register a factory function
     * @param {string} name - Service identifier
     * @param {Function} factory - Factory function(container) => instance
     */
    factory(name, factory) {
        this.services.set(name, {
            factory: () => factory(this),
            deps: [],
            lifecycle: 'singleton'
        });
    }

    /**
     * Resolve a service by name
     * @param {string} name - Service identifier
     * @returns {*} Resolved service instance
     */
    resolve(name) {
        // Check if already instantiated (singleton cache)
        if (this.instances.has(name)) {
            return this.instances.get(name);
        }

        // Get service definition
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service "${name}" not registered`);
        }

        // Detect circular dependencies
        if (this.resolving.has(name)) {
            const chain = Array.from(this.resolving).join(' -> ');
            throw new Error(`Circular dependency detected: ${chain} -> ${name}`);
        }

        this.resolving.add(name);

        try {
            // Resolve dependencies
            const deps = service.deps.map((dep) => this.resolve(dep));

            // Create instance
            let instance;
            if (typeof service.factory === 'function') {
                // Check if it's a class (has prototype) or factory function
                if (
                    service.factory.prototype &&
                    service.factory.prototype.constructor === service.factory
                ) {
                    // It's a class constructor
                    instance = new service.factory(...deps);
                } else {
                    // It's a factory function
                    instance = service.factory(...deps);
                }
            } else {
                instance = service.factory;
            }

            // Cache singleton instances
            if (service.lifecycle === 'singleton') {
                this.instances.set(name, instance);
            }

            this.resolving.delete(name);
            return instance;
        } catch (error) {
            this.resolving.delete(name);
            throw new Error(`Failed to resolve "${name}": ${error.message}`);
        }
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service identifier
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Get all registered service names
     * @returns {Array<string>}
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }

    /**
     * Clear all instances (useful for testing)
     */
    clearInstances() {
        this.instances.clear();
    }

    /**
     * Reset container completely
     */
    reset() {
        this.services.clear();
        this.instances.clear();
        this.resolving.clear();
    }

    /**
     * Create a scoped container (child container)
     * Inherits parent registrations but has separate instances
     * @returns {DIContainer}
     */
    createScope() {
        const scope = new DIContainer();
        // Copy service registrations (but not instances)
        this.services.forEach((service, name) => {
            scope.services.set(name, { ...service });
        });
        return scope;
    }
}

/**
 * Create and configure the game's DI container
 * @returns {DIContainer}
 */
export function createGameContainer() {
    const container = new DIContainer();

    // Register configuration values
    container.value(
        'debugMode',
        new URLSearchParams(window.location.search).get('debug') === 'true'
    );

    return container;
}
