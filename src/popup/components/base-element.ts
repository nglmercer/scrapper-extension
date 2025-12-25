/**
 * Base class for all custom elements in the popup
 * Provides common functionality like event handling, state management, and lifecycle methods
 */
export abstract class BaseElement extends HTMLElement {
    protected _isConnected = false;
    protected _shadowRoot: ShadowRoot | null = null;
    protected _data: Record<string, any> = {};
    protected _controller: any = null; // Will be set by decorator
    protected _unsubscribers: Array<() => void> = [];
    
    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
    }
    
    /**
     * Override querySelector to work with shadow DOM
     */
    override querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
    override querySelector<K extends keyof SVGElementTagNameMap>(selectors: K): SVGElementTagNameMap[K] | null;
    override querySelector<E extends Element = Element>(selectors: string): E | null;
    override querySelector(selectors: string): Element | null {
        return this._shadowRoot?.querySelector(selectors) || null;
    }
    
    /**
     * Override querySelectorAll to work with shadow DOM
     */
    override querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]>;
    override querySelectorAll<K extends keyof SVGElementTagNameMap>(selectors: K): NodeListOf<SVGElementTagNameMap[K]>;
    override querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
    override querySelectorAll(selectors: string): NodeListOf<Element> {
        return this._shadowRoot?.querySelectorAll(selectors) || document.querySelectorAll('.__empty__');
    }
    
    /**
     * Called when element is added to DOM
     */
    connectedCallback() {
        this._isConnected = true;
        this.render();
        this.attachEventListeners();
        this.onConnected();
    }
    
    /**
     * Called when element is removed from DOM
     */
    disconnectedCallback() {
        this._isConnected = false;
        this.detachEventListeners();
        this.onDisconnected();
    }
    
    /**
     * Observed attributes for attribute changes
     */
    static get observedAttributes(): string[] {
        return [];
    }
    
    /**
     * Called when observed attributes change
     */
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue !== newValue) {
            this.onAttributeChanged(name, oldValue, newValue);
            if (this._isConnected) {
                this.render();
            }
        }
    }
    
    /**
     * Set data property and trigger re-render if connected
     */
    setData(key: string, value: any) {
        this._data[key] = value;
        if (this._isConnected) {
            this.render();
        }
    }
    
    /**
     * Get data property
     */
    getData(key: string): any {
        return this._data[key];
    }
    
    /**
     * Set multiple data properties at once
     */
    setDataBatch(data: Record<string, any>) {
        Object.assign(this._data, data);
        if (this._isConnected) {
            this.render();
        }
    }
    
    /**
     * Dispatch custom event with detail
     */
    emit(eventName: string, detail: any = null) {
        this.dispatchEvent(new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true
        }));
    }
    
    /**
     * Abstract methods to be implemented by subclasses
     */
    protected abstract render(): void;
    protected abstract attachEventListeners(): void;
    protected abstract detachEventListeners(): void;
    
    /**
     * Lifecycle hooks that can be overridden by subclasses
     */
    protected onConnected(): void {}
    protected onDisconnected(): void {}
    protected onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {}
    
    /**
     * Helper method to create element from template string
     */
    protected createElement(html: string): HTMLElement {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild as HTMLElement;
    }
    
    /**
     * Helper method to get element by ID from shadow DOM
     */
    protected getElement<T extends HTMLElement>(id: string): T | null {
        return this._shadowRoot?.getElementById(id) as T | null;
    }
    
}