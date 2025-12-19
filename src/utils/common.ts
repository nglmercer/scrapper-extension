/**
 * Common utility functions to avoid code duplication and improve maintainability
 */

/**
 * Creates a promise that resolves after a specified delay.
 * @param ms Delay in milliseconds
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks if the current environment has the Chrome API available.
 */
export const isChromeApiAvailable = (): boolean => {
    return typeof chrome !== 'undefined' && !!chrome.runtime;
};

/**
 * Safely parses JSON, returning null if parsing fails.
 * @param jsonString The JSON string to parse
 */
export const safeJsonParse = <T = any>(jsonString: string): T | null => {
    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
};

/**
 * Adds a timestamp to a data payload.
 * @param data The payload data
 */
export const withTimestamp = <T extends object>(data: T): T & { time: string } => {
    return {
        ...data,
        time: new Date().toLocaleString()
    };
};
