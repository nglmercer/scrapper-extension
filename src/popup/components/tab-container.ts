import { BaseElement } from './base-element.js';
import { connectToController, subscribeToState } from './pattern-controller.js';

@connectToController
export class TabContainer extends BaseElement {
    private _tabs: Array<{ id: string; label: string; icon?: string }> = [];
    private _activeTab: string = '';
    private _navElement: HTMLElement | null = null;
    private _contentElement: HTMLElement | null = null;
    
    static override get observedAttributes(): string[] {
        return ['tabs', 'active-tab'];
    }
    
    constructor() {
        super();
    }
    
    protected render(): void {
        if (!this._shadowRoot) return;
        
        const tabsAttr = this.getAttribute('tabs');
        const activeTab = this.getAttribute('active-tab') || '';
        
        if (tabsAttr) {
            try {
                this._tabs = JSON.parse(tabsAttr);
            } catch (e) {
                console.error('Invalid tabs JSON:', e);
                this._tabs = [];
            }
        }
        
        this._activeTab = activeTab;
        
        this._shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
                
                .tabs-nav {
                    display: flex;
                    background: var(--card-bg, #ffffff);
                    padding: 0 1rem;
                    border-bottom: 1px solid var(--border, #e2e8f0);
                    gap: 1rem;
                }
                
                .tab-btn {
                    background: none;
                    border: none;
                    padding: 12px 4px;
                    color: var(--text-muted, #64748b);
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 13px;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .tab-btn:hover {
                    color: var(--text-main, #1e293b);
                }
                
                .tab-btn.active {
                    color: var(--primary, #6366f1);
                    border-bottom-color: var(--primary, #6366f1);
                }
                
                .tab-content {
                    display: none;
                    animation: fadeIn 0.3s ease;
                }
                
                .tab-content.active {
                    display: block;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .content-area {
                    padding: 1rem;
                    overflow-y: auto;
                    flex: 1;
                }
            </style>
            
            <div class="tabs-nav" id="tabs-nav">
                ${this._tabs.map(tab => `
                    <button class="tab-btn ${tab.id === this._activeTab ? 'active' : ''}" data-tab="${tab.id}">
                        ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
                        ${tab.label}
                    </button>
                `).join('')}
            </div>
            
            <div class="content-area" id="content-area">
                <slot></slot>
            </div>
        `;
        
        this._navElement = this.getElement('tabs-nav');
        this._contentElement = this.getElement('content-area');
    }
    
    protected attachEventListeners(): void {
        // Access shadow DOM directly to get tab buttons
        const tabButtons = this._shadowRoot?.querySelectorAll('.tab-btn');
        if (tabButtons) {
            tabButtons.forEach(btn => {
                btn.addEventListener('click', this.handleTabClick.bind(this));
            });
        }
    }
    
    protected detachEventListeners(): void {
        // Access shadow DOM directly to get tab buttons
        const tabButtons = this._shadowRoot?.querySelectorAll('.tab-btn');
        if (tabButtons) {
            tabButtons.forEach(btn => {
                btn.removeEventListener('click', this.handleTabClick.bind(this));
            });
        }
    }
    
    protected override onConnected(): void {
        // Subscribe to active tab changes from controller
        if (this._controller) {
            subscribeToState(this, 'activeTab', (tabId) => {
                if (tabId && tabId !== this._activeTab) {
                    this.setAttribute('active-tab', tabId);
                }
            });
            
            // Set initial active tab if not set
            const currentActiveTab = this._controller.getState('activeTab');
            if (currentActiveTab && !this.getAttribute('active-tab')) {
                this.setAttribute('active-tab', currentActiveTab);
            }
        }
    }
    
    private handleTabClick(event: Event): void {
        const target = event.target as HTMLElement;
        const tabBtn = target.closest('.tab-btn') as HTMLElement;
        
        if (!tabBtn) return;
        
        const tabId = tabBtn.dataset.tab;
        if (!tabId) return;
        
        // Update active tab
        this.setAttribute('active-tab', tabId);
        
        // Update controller state
        if (this._controller) {
            this._controller.setState('activeTab', tabId);
        }
        
        // Emit tab change event
        this.emit('tab-change', { tabId, previousTab: this._activeTab });
        
        // Update UI
        this.updateActiveTab(tabId);
    }
    
    private updateActiveTab(activeTabId: string): void {
        // Update button states
        const tabButtons = this._shadowRoot?.querySelectorAll('.tab-btn') || [];
        tabButtons.forEach(btn => {
            const tabId = (btn as HTMLElement).dataset.tab;
            if (tabId === activeTabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update content visibility - access light DOM children using native querySelectorAll
        // (BaseElement overrides querySelectorAll to search shadow DOM, but we need light DOM)
        const tabContents = HTMLElement.prototype.querySelectorAll.call(this, '.tab-content') || [];
        tabContents.forEach(content => {
            const contentId = (content as HTMLElement).id;
            if (contentId === activeTabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }
    
    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue !== newValue) {
            switch (name) {
                case 'tabs':
                    if (newValue) {
                        try {
                            this._tabs = JSON.parse(newValue);
                        } catch (e) {
                            console.error('Invalid tabs JSON:', e);
                            this._tabs = [];
                        }
                    }
                    break;
                case 'active-tab':
                    this._activeTab = newValue || '';
                    if (this._isConnected) {
                        this.updateActiveTab(this._activeTab);
                    }
                    break;
            }
            if (this._isConnected && name !== 'active-tab') {
                this.render();
            }
        }
    }
    
    /**
     * Add a tab dynamically
     */
    addTab(tab: { id: string; label: string; icon?: string }): void {
        if (!this._tabs.find(t => t.id === tab.id)) {
            this._tabs.push(tab);
            this.setAttribute('tabs', JSON.stringify(this._tabs));
        }
    }
    
    /**
     * Remove a tab
     */
    removeTab(tabId: string): void {
        this._tabs = this._tabs.filter(t => t.id !== tabId);
        this.setAttribute('tabs', JSON.stringify(this._tabs));
        
        // If removing active tab, switch to first available tab
        if (this._activeTab === tabId && this._tabs.length > 0) {
            this.setAttribute('active-tab', this._tabs[0]!.id);
        }
    }
}

// Register the custom element
customElements.define('tab-container', TabContainer);
