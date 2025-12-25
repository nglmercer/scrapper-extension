import { BaseElement } from './base-element.js';

export class Card extends BaseElement {
    private _header: string = '';
    private _collapsible: boolean = false;
    private _collapsed: boolean = false;
    private _badge: string = '';
    
    static override get observedAttributes(): string[] {
        return ['header', 'collapsible', 'collapsed', 'badge'];
    }
    
    constructor() {
        super();
    }
    
    protected render(): void {
        if (!this._shadowRoot) return;
        
        const header = this.getAttribute('header') || '';
        const collapsible = this.getAttribute('collapsible') === 'true';
        const collapsed = this.getAttribute('collapsed') === 'true';
        const badge = this.getAttribute('badge') || '';
        
        this._shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 16px;
                }
                
                :host(:last-child) {
                    margin-bottom: 0;
                }
                
                .card {
                    background: var(--card-bg, #ffffff);
                    border: 1px solid var(--border, #e2e8f0);
                    border-radius: var(--radius, 8px);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
                }
                
                .card-header {
                    background: rgba(0,0,0,0.02);
                    padding: 10px 16px;
                    border-bottom: 1px solid var(--border, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: ${collapsible ? 'pointer' : 'default'};
                }
                
                .card-header h4 {
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-muted, #64748b);
                    font-weight: 600;
                    margin: 0;
                }
                
                .card-header-badge {
                    font-size: 10px;
                    background: var(--border, #e2e8f0);
                    padding: 2px 6px;
                    border-radius: 99px;
                    color: var(--text-muted, #64748b);
                    font-weight: 500;
                }
                
                .card-content {
                    padding: 16px;
                    transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
                    max-height: ${collapsed ? '0' : 'none'};
                    opacity: ${collapsed ? '0' : '1'};
                    overflow: ${collapsed ? 'hidden' : 'visible'};
                }
                
                .card-content.collapsed {
                    max-height: 0;
                    opacity: 0;
                    padding-top: 0;
                    padding-bottom: 0;
                }
                
                .card-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                }
                
                .item-label h3 {
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 2px;
                    color: var(--text-main, #1e293b);
                }
                
                .item-label p {
                    font-size: 12px;
                    color: var(--text-muted, #64748b);
                    margin: 0;
                }
                
                .collapsible-icon {
                    margin-left: 8px;
                    transition: transform 0.3s ease;
                    transform: ${collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
                }
            </style>
            
            <div class="card">
                ${header ? `
                    <div class="card-header" id="card-header">
                        <h4>${header}</h4>
                        ${badge ? `<span class="card-header-badge">${badge}</span>` : ''}
                        ${collapsible ? `<span class="collapsible-icon">▼</span>` : ''}
                    </div>
                ` : ''}
                <div class="card-content" id="card-content" class="${collapsed ? 'collapsed' : ''}">
                    <slot></slot>
                </div>
            </div>
        `;
    }
    
    protected attachEventListeners(): void {
        const header = this.getElement('card-header');
        if (header && this.getAttribute('collapsible') === 'true') {
            header.addEventListener('click', this.handleHeaderClick.bind(this));
        }
    }
    
    protected detachEventListeners(): void {
        const header = this.getElement('card-header');
        if (header) {
            header.removeEventListener('click', this.handleHeaderClick.bind(this));
        }
    }
    
    private handleHeaderClick(): void {
        const currentCollapsed = this.getAttribute('collapsed') === 'true';
        this.setAttribute('collapsed', (!currentCollapsed).toString());
        this.emit('toggle', { collapsed: !currentCollapsed });
    }
    
    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue !== newValue) {
            switch (name) {
                case 'header':
                    this._header = newValue || '';
                    break;
                case 'collapsible':
                    this._collapsible = newValue === 'true';
                    break;
                case 'collapsed':
                    this._collapsed = newValue === 'true';
                    break;
                case 'badge':
                    this._badge = newValue || '';
                    break;
            }
            if (this._isConnected) {
                this.render();
            }
        }
    }
}

// Register the custom element
customElements.define('setting-card', Card);