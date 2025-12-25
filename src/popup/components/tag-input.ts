import { BaseElement } from './base-element.js';
import { connectToController, subscribeToState } from './pattern-controller.js';

@connectToController
export class TagInput extends BaseElement {
    private _tags: string[] = [];
    private _placeholder: string = '';
    private _delimiter: string = '\n';
    private _stateKey: string = '';
    private _input: HTMLInputElement | null = null;
    private _tagsList: HTMLElement | null = null;
    
    static override get observedAttributes(): string[] {
        return ['placeholder', 'delimiter', 'state-key', 'tags'];
    }
    
    constructor() {
        super();
    }
    
    protected render(): void {
        if (!this._shadowRoot) return;
        
        const placeholder = this.getAttribute('placeholder') || 'Add tag and press Enter...';
        const tagsAttr = this.getAttribute('tags');
        
        if (tagsAttr) {
            try {
                this._tags = JSON.parse(tagsAttr);
            } catch (e) {
                this._tags = [];
            }
        }
        
        this._shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
                
                .tag-input-container {
                    background: var(--background, #f8fafc);
                    border: 1px solid var(--border, #e2e8f0);
                    border-radius: var(--radius-sm, 4px);
                    padding: 8px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    min-height: 80px;
                    cursor: text;
                }
                
                .tag-input-container:focus-within {
                    border-color: var(--primary, #6366f1);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
                }
                
                .tags-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    width: 100%;
                }
                
                .tag {
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--primary, #6366f1);
                    border: 1px solid rgba(99, 102, 241, 0.2);
                    border-radius: 4px;
                    padding: 2px 8px;
                    font-size: 12px;
                    font-family: monospace;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    max-width: 100%;
                }
                
                .tag span {
                    word-break: break-all;
                    min-width: 0;
                }
                
                .tag .remove-tag {
                    cursor: pointer;
                    font-weight: bold;
                    opacity: 0.6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                
                .tag .remove-tag:hover {
                    opacity: 1;
                    background: rgba(0,0,0,0.1);
                }
                
                .tag-input {
                    border: none;
                    background: transparent;
                    padding: 4px;
                    font-size: 13px;
                    flex: 1;
                    min-width: 120px;
                    outline: none;
                    box-shadow: none;
                }
                
                .tag-input:focus {
                    box-shadow: none;
                    border: none;
                }
            </style>
            
            <div class="tag-input-container" id="tag-input-container">
                <div class="tags-list" id="tags-list"></div>
                <input type="text" class="tag-input" id="tag-input" placeholder="${placeholder}">
            </div>
        `;
        
        this._input = this.getElement('tag-input');
        this._tagsList = this.getElement('tags-list');
        
        this.renderTags();
    }
    
    protected attachEventListeners(): void {
        this._input?.addEventListener('keydown', this.handleInputKeydown.bind(this));
        this.getElement('tag-input-container')?.addEventListener('click', this.handleContainerClick.bind(this));
    }
    
    protected detachEventListeners(): void {
        this._input?.removeEventListener('keydown', this.handleInputKeydown.bind(this));
        this.getElement('tag-input-container')?.removeEventListener('click', this.handleContainerClick.bind(this));
    }
    
    protected override onConnected(): void {
        this._stateKey = this.getAttribute('state-key') || '';
        this._delimiter = this.getAttribute('delimiter') || '\n';
        
        if (this._stateKey && this._controller) {
            // Subscribe to state changes
            subscribeToState(this, this._stateKey, (tags) => {
                if (Array.isArray(tags) && JSON.stringify(tags) !== JSON.stringify(this._tags)) {
                    this._tags = tags;
                    this.renderTags();
                    this.emit('change', { tags: this._tags });
                }
            });
            
            // Set initial state if not already set
            if (this._controller.getState(this._stateKey) === undefined) {
                this._controller.setState(this._stateKey, this._tags);
            }
        }
    }
    
    private handleInputKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            this.addTag(this._input!.value);
        } else if (event.key === 'Backspace' && this._input!.value === '' && this._tags.length > 0) {
            this.removeTag(this._tags.length - 1);
        }
    }
    
    private handleContainerClick(): void {
        this._input?.focus();
    }
    
    private addTag(text: string): void {
        const value = text.trim();
        if (value && !this._tags.includes(value)) {
            this._tags.push(value);
            this._input!.value = '';
            this.renderTags();
            this.updateState();
            this.emit('change', { tags: this._tags });
        } else {
            this._input!.value = '';
        }
    }
    
    private removeTag(index: number): void {
        this._tags.splice(index, 1);
        this.renderTags();
        this.updateState();
        this.emit('change', { tags: this._tags });
    }
    
    private renderTags(): void {
        if (!this._tagsList) return;
        
        this._tagsList.innerHTML = '';
        this._tags.forEach((tag, index) => {
            const tagEl = document.createElement('div');
            tagEl.className = 'tag';
            
            const tagText = document.createElement('span');
            tagText.textContent = tag;
            
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-tag';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeTag(index);
            };
            
            tagEl.appendChild(tagText);
            tagEl.appendChild(removeBtn);
            this._tagsList!.appendChild(tagEl);
        });
    }
    
    private updateState(): void {
        if (this._stateKey && this._controller) {
            this._controller.setState(this._stateKey, this._tags);
        }
        this.setAttribute('tags', JSON.stringify(this._tags));
    }
    
    /**
     * Set tags from outside
     */
    setTags(tags: string[]): void {
        this._tags = [...tags];
        this.renderTags();
        this.updateState();
    }
    
    /**
     * Get current tags
     */
    getTags(): string[] {
        return [...this._tags];
    }
    
    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue !== newValue) {
            switch (name) {
                case 'placeholder':
                    if (this._input) {
                        this._input.placeholder = newValue || '';
                    }
                    break;
                case 'delimiter':
                    this._delimiter = newValue || '\n';
                    break;
                case 'state-key':
                    this._stateKey = newValue || '';
                    break;
                case 'tags':
                    if (newValue) {
                        try {
                            const newTags = JSON.parse(newValue);
                            if (JSON.stringify(newTags) !== JSON.stringify(this._tags)) {
                                this._tags = newTags;
                                this.renderTags();
                            }
                        } catch (e) {
                            console.error('Invalid tags JSON:', e);
                        }
                    }
                    break;
            }
        }
    }
}

// Register the custom element
customElements.define('tag-input', TagInput);