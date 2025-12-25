/**
 * Pattern Controller for managing application state and coordinating between components
 * Implements the Observer pattern for reactive state management
 */
export class PatternController {
    private static _instance: PatternController | null = null;
    private _state: Record<string, any> = {};
    private _observers: Map<string, Set<(data: any) => void>> = new Map();
    private _middleware: Array<(action: string, data: any) => any> = [];
    
    private constructor() {
        this._state = {};
    }
    
    /**
     * Get singleton instance
     */
    static getInstance(): PatternController {
        if (!PatternController._instance) {
            PatternController._instance = new PatternController();
        }
        return PatternController._instance;
    }
    
    /**
     * Get current state value
     */
    getState(key: string): any {
        return this._state[key];
    }
    
    /**
     * Get entire state
     */
    getFullState(): Record<string, any> {
        return { ...this._state };
    }
    
    /**
     * Set state value and notify observers
     */
    setState(key: string, value: any, silent: boolean = false): void {
        const oldValue = this._state[key];
        this._state[key] = value;
        
        if (!silent && oldValue !== value) {
            this.notifyObservers(key, value);
        }
    }
    
    /**
     * Set multiple state values at once
     */
    setStateBatch(updates: Record<string, any>, silent: boolean = false): void {
        const changedKeys: string[] = [];
        
        for (const [key, value] of Object.entries(updates)) {
            const oldValue = this._state[key];
            this._state[key] = value;
            if (oldValue !== value) {
                changedKeys.push(key);
            }
        }
        
        if (!silent && changedKeys.length > 0) {
            changedKeys.forEach(key => this.notifyObservers(key, this._state[key]));
        }
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key: string, callback: (data: any) => void): () => void {
        if (!this._observers.has(key)) {
            this._observers.set(key, new Set());
        }
        
        this._observers.get(key)!.add(callback);
        
        // Return unsubscribe function
        return () => {
            const observers = this._observers.get(key);
            if (observers) {
                observers.delete(callback);
                if (observers.size === 0) {
                    this._observers.delete(key);
                }
            }
        };
    }
    
    /**
     * Subscribe to multiple state keys
     */
    subscribeMultiple(keys: string[], callback: (data: Record<string, any>) => void): () => void {
        const unsubscribeFunctions: Array<() => void> = [];
        
        keys.forEach(key => {
            const unsubscribe = this.subscribe(key, (value) => {
                const currentState = keys.reduce((acc, k) => {
                    acc[k] = this._state[k];
                    return acc;
                }, {} as Record<string, any>);
                callback(currentState);
            });
            unsubscribeFunctions.push(unsubscribe);
        });
        
        // Return combined unsubscribe function
        return () => {
            unsubscribeFunctions.forEach(unsub => unsub());
        };
    }
    
    /**
     * Notify all observers of a state change
     */
    private notifyObservers(key: string, value: any): void {
        const observers = this._observers.get(key);
        if (observers) {
            observers.forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`Error in observer callback for key "${key}":`, error);
                }
            });
        }
    }
    
    /**
     * Add middleware for state changes
     */
    addMiddleware(middleware: (action: string, data: any) => any): void {
        this._middleware.push(middleware);
    }
    
    /**
     * Dispatch action through middleware
     */
    dispatch(action: string, data: any): void {
        let processedData = data;
        
        // Apply middleware
        for (const middleware of this._middleware) {
            processedData = middleware(action, processedData);
        }
        
        // Handle specific actions
        switch (action) {
            case 'SET_CONFIG':
                this.setStateBatch(processedData);
                break;
            case 'UPDATE_CONFIG':
                this.setStateBatch(processedData);
                break;
            case 'RESET_CONFIG':
                this.setStateBatch(processedData);
                break;
            default:
                // Generic action handling
                if (processedData.key) {
                    this.setState(processedData.key, processedData.value);
                }
                break;
        }
    }
    
    /**
     * Reset state to initial values
     */
    resetState(initialState: Record<string, any>): void {
        this._state = { ...initialState };
        Object.keys(initialState).forEach(key => {
            this.notifyObservers(key, initialState[key]);
        });
    }
    
    /**
     * Clear all state and observers
     */
    clear(): void {
        this._state = {};
        this._observers.clear();
        this._middleware = [];
    }
}

/**
 * Decorator for connecting components to the pattern controller
 */
export function connectToController(target: any) {
    const originalConnectedCallback = target.prototype.connectedCallback;
    const originalDisconnectedCallback = target.prototype.disconnectedCallback;
    
    target.prototype.connectedCallback = function() {
        this._controller = PatternController.getInstance();
        if (originalConnectedCallback) {
            originalConnectedCallback.call(this);
        }
    };
    
    target.prototype.disconnectedCallback = function() {
        if (this._unsubscribers) {
            this._unsubscribers.forEach((unsub: () => void) => unsub());
            this._unsubscribers = [];
        }
        if (originalDisconnectedCallback) {
            originalDisconnectedCallback.call(this);
        }
    };
    
    return target;
}

/**
 * Helper function to create a subscription in components
 */
export function subscribeToState(component: any, key: string, callback: (data: any) => void) {
    if (!component._unsubscribers) {
        component._unsubscribers = [];
    }
    
    const unsubscribe = component._controller.subscribe(key, callback);
    component._unsubscribers.push(unsubscribe);
    
    return unsubscribe;
}