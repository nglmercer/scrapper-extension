import { BaseElement } from './base-element.js';
import { connectToController, subscribeToState } from './pattern-controller.js';

@connectToController
export class SwitchToggle extends BaseElement {
    private _input: HTMLInputElement | null = null;
    private _slider: HTMLElement | null = null;
    private _label: string = '';
    private _description: string = '';
    private _stateKey: string = '';
    
    static override get observedAttributes(): string[] {
        return ['label', 'description', 'state-key', 'checked'];
    }
    
    constructor() {
        super();
    }
    
    protected render(): void {
        if (!this._shadowRoot) return;
        
        const checked = this.getAttribute('checked') === 'true';
        const label = this.getAttribute('label') || '';
        const description = this.getAttribute('description') || '';
        
        this._shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
                
                .switch-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: var(--card-bg, #ffffff);
                    border: 1px solid var(--border, #e2e8f0);
                    border-radius: 8px;
                    margin-bottom: 16px;
                }
                
                .switch-info h3 {
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 2px;
                    color: var(--text-main, #1e293b);
                }
                
                .switch-info p {
                    font-size: 12px;
                    color: var(--text-muted, #64748b);
                    margin: 0;
                }
                
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }
                
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--border, #e2e8f0);
                    transition: .3s;
                    border-radius: 24px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                input:checked + .slider {
                    background-color: var(--primary, #6366f1);
                }
                
                input:checked + .slider:before {
                    transform: translateX(20px);
                }
            </style>
            
            <div class="switch-container">
                <div class="switch-info">
                    <h3>${label}</h3>
                    <p>${description}</p>
                </div>
                <label class="switch">
                    <input type="checkbox" id="toggle-input" ${checked ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;
        
        this._input = this.getElement('toggle-input');
        this._slider = this.querySelector('.slider');
    }
    
    protected attachEventListeners(): void {
        this._input?.addEventListener('change', this.handleToggleChange.bind(this));
    }
    
    protected detachEventListeners(): void {
        this._input?.removeEventListener('change', this.handleToggleChange.bind(this));
    }
    
    protected override onConnected(): void {
        this._stateKey = this.getAttribute('state-key') || '';
        
        if (this._stateKey && this._controller) {
            // Subscribe to state changes
            subscribeToState(this, this._stateKey, (value) => {
                if (this._input && this._input.checked !== value) {
                    this._input.checked = value;
                    this.emit('change', { checked: value });
                }
            });
            
            // Set initial state if not already set
            if (this._controller.getState(this._stateKey) === undefined) {
                this._controller.setState(this._stateKey, this._input?.checked || false);
            }
        }
    }
    
    private handleToggleChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        const checked = target.checked;
        
        if (this._stateKey && this._controller) {
            this._controller.setState(this._stateKey, checked);
        }
        
        this.emit('change', { checked });
    }
    
    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue !== newValue) {
            switch (name) {
                case 'label':
                    this._label = newValue || '';
                    break;
                case 'description':
                    this._description = newValue || '';
                    break;
                case 'state-key':
                    this._stateKey = newValue || '';
                    break;
                case 'checked':
                    if (this._input && this._input.checked !== (newValue === 'true')) {
                        this._input.checked = newValue === 'true';
                    }
                    break;
            }
        }
    }
}

// Register the custom element
customElements.define('switch-toggle', SwitchToggle);
