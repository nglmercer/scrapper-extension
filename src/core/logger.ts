/**
 * Central Logger Service
 * Handles logging across the extension with support for debug mode,
 * popup forwarding, and console clearing to prevent memory leaks.
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  source?: string;
}

export class Logger {
  private static instance: Logger;
  private debugMode: boolean = false;
  private listeners: Set<(log: LogMessage) => void> = new Set();
  private consoleClearInterval: number = 300 * 1000; // 5 minutes by default
  private clearTimer: any = null;
  private maxLogs: number = 1000; // Keep limited history in memory if needed
  private logHistory: LogMessage[] = [];

  private constructor() {
    this.startAutoClear();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set debug mode state
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (enabled) {
        this.info('Debug mode enabled', 'Logger');
    }
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Log an info message
   */
  info(message: string, source: string = 'App', data?: any): void {
    this.log(LogLevel.INFO, message, source, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, source: string = 'App', data?: any): void {
    this.log(LogLevel.WARN, message, source, data);
  }

  /**
   * Log an error message
   */
  error(message: string, source: string = 'App', data?: any): void {
    this.log(LogLevel.ERROR, message, source, data);
  }

  /**
   * Log a debug message (only if debug mode is enabled)
   */
  debug(message: string, source: string = 'App', data?: any): void {
    if (this.debugMode) {
      this.log(LogLevel.DEBUG, message, source, data);
    }
  }

  /**
   * Core log function
   */
  private log(level: LogLevel, message: string, source: string, data?: any): void {
    const logEntry: LogMessage = {
      level,
      message,
      data,
      timestamp: Date.now(),
      source
    };

    // Console output
    const prefix = `[${level}] [${source}]`;
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.DEBUG:
        // Already checked debugMode in debug() but ensure here too for safety
         if (this.debugMode) console.log(prefix, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
    }

    // Store in history
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxLogs) {
      this.logHistory.shift();
    }

    // Notify listeners (e.g. Popup)
    this.notifyListeners(logEntry);
  }

  /**
   * Add a listener for new logs (e.g. from Popup)
   */
  addListener(callback: (log: LogMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of a new log
   */
  private notifyListeners(log: LogMessage): void {
    this.listeners.forEach(listener => {
      try {
        listener(log);
      } catch (e) {
        console.error('Error in log listener', e);
      }
    });

    // If implementing port messaging to popup, that logic can also go here 
    // or the caller can use addListener to bridge it.
  }

  /**
   * Get current log history
   */
  getHistory(): LogMessage[] {
    return [...this.logHistory];
  }

  /**
   * Clear console to prevent memory leaks
   */
  clearConsole(): void {
    if (typeof console !== 'undefined' && console.clear) {
      console.clear();
      // Keep a special log to know we cleared it
      // Don't use this.info() to avoid loop if we decide to log clears to history
      // console.log('[System] Console cleared to release memory.');
    }
  }

  /**
   * Start auto-clear interval
   */
  private startAutoClear(): void {
    if (this.clearTimer) clearInterval(this.clearTimer);
    this.clearTimer = setInterval(() => {
      // Only clear if we have accumulated a lot of data or just periodically
      // Here we do it periodically to cover long running sessions
       this.clearConsole();
    }, this.consoleClearInterval);
  }
}

export const logger = Logger.getInstance();
