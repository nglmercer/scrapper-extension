// WebComponents for Popup UI

// ==========================================
// Base Component Class
// ==========================================
abstract class BaseComponent extends HTMLElement {
    protected value: any = null;

    constructor() {
        super();
    }

    // Public API
    setData(data: any): void {
        this.value = data;
        this.updateContent();
    }

    getData(): any {
        return this.value;
    }

    // Abstract methods
    protected abstract updateContent(): void;
    protected abstract render(): void;
    protected abstract attachEvents(): void;

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    protected dispatchChangeEvent() {
        const event = new CustomEvent('change', {
            bubbles: true,
            detail: { value: this.value }
        });
        this.dispatchEvent(event);
    }

    protected dispatchInputEvent() {
        const event = new CustomEvent('input', {
            bubbles: true,
            detail: { value: this.value }
        });
        this.dispatchEvent(event);
    }
}

// ==========================================
// Toggle Switch Component
// ==========================================
class ToggleSwitch extends BaseComponent {
    private checkbox!: HTMLInputElement;
    private label?: string;
    private description?: string;
    private hasRendered: boolean = false;

    static get observedAttributes() {
        return ['label', 'description', 'checked'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'label') this.label = newValue;
        if (name === 'description') this.description = newValue;
        if (name === 'checked') {
            this.value = newValue !== null;
            if (this.checkbox) this.checkbox.checked = this.value;
        }
    }

    protected render() {
        // Only render once to prevent duplication
        if (this.hasRendered) {
            return;
        }
        this.hasRendered = true;

        const wrapper = document.createElement('div');
        wrapper.className = 'card-item';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'item-label';

        if (this.label) {
            const h3 = document.createElement('h3');
            h3.textContent = this.label;
            labelDiv.appendChild(h3);
        }

        if (this.description) {
            const p = document.createElement('p');
            p.textContent = this.description;
            labelDiv.appendChild(p);
        }

        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';

        this.checkbox = document.createElement('input');
        this.checkbox.type = 'checkbox';
        this.checkbox.checked = this.value !== null ? this.value : this.hasAttribute('checked');

        const slider = document.createElement('span');
        slider.className = 'slider';

        switchLabel.appendChild(this.checkbox);
        switchLabel.appendChild(slider);

        wrapper.appendChild(labelDiv);
        wrapper.appendChild(switchLabel);

        const container = document.createElement('div');
        container.className = 'card';
        container.appendChild(wrapper);

        this.appendChild(container);
    }

    protected updateContent() {
        if (this.checkbox) {
            this.checkbox.checked = !!this.value;
        }
    }

    protected attachEvents() {
        this.checkbox.addEventListener('change', () => {
            this.value = this.checkbox.checked;
            this.dispatchChangeEvent();
        });
    }
}

// ==========================================
// Text Input Component
// ==========================================
class TextInput extends BaseComponent {
    private input!: HTMLInputElement;
    private label?: string;
    private placeholder?: string;
    private helpText?: string;
    private hasRendered: boolean = false;

    static get observedAttributes() {
        return ['label', 'placeholder', 'value', 'help-text'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'label') this.label = newValue;
        if (name === 'placeholder') this.placeholder = newValue;
        if (name === 'value') {
            this.value = newValue;
            if (this.input) this.input.value = this.value;
        }
        if (name === 'help-text') this.helpText = newValue;
    }

    protected render() {
        // Only render once to prevent duplication
        if (this.hasRendered) {
            return;
        }
        this.hasRendered = true;

        const container = document.createElement('div');
        container.className = 'input-group';

        if (this.label) {
            const label = document.createElement('label');
            label.textContent = this.label;
            label.htmlFor = 'input-field';
            container.appendChild(label);
        }

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.id = 'input-field';
        if (this.placeholder) this.input.placeholder = this.placeholder;
        if (this.value !== null) this.input.value = this.value;

        container.appendChild(this.input);

        if (this.helpText) {
            const help = document.createElement('p');
            help.className = 'help-text';
            help.textContent = this.helpText;
            container.appendChild(help);
        }

        this.appendChild(container);
    }

    protected updateContent() {
        if (this.input && this.value !== null) {
            this.input.value = String(this.value);
        }
    }

    protected attachEvents() {
        this.input.addEventListener('input', () => {
            this.value = this.input.value;
            this.dispatchInputEvent();
        });

        this.input.addEventListener('change', () => {
            this.value = this.input.value;
            this.dispatchChangeEvent();
        });
    }
}

// ==========================================
// Number Input Component
// ==========================================
class NumberInput extends BaseComponent {
    private input!: HTMLInputElement;
    private label?: string;
    private min?: number;
    private max?: number;
    private helpText?: string;
    private hasRendered: boolean = false;

    static get observedAttributes() {
        return ['label', 'min', 'max', 'value', 'help-text'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'label') this.label = newValue;
        if (name === 'min') this.min = parseFloat(newValue);
        if (name === 'max') this.max = parseFloat(newValue);
        if (name === 'value') {
            this.value = parseFloat(newValue);
            if (this.input) this.input.value = String(this.value);
        }
        if (name === 'help-text') this.helpText = newValue;
    }

    protected render() {
        // Only render once to prevent duplication
        if (this.hasRendered) {
            return;
        }
        this.hasRendered = true;

        const container = document.createElement('div');
        container.className = 'input-group';

        if (this.label) {
            const label = document.createElement('label');
            label.textContent = this.label;
            label.htmlFor = 'input-field';
            container.appendChild(label);
        }

        this.input = document.createElement('input');
        this.input.type = 'number';
        this.input.id = 'input-field';
        if (this.min !== undefined) this.input.min = String(this.min);
        if (this.max !== undefined) this.input.max = String(this.max);
        if (this.value !== null) this.input.value = String(this.value);

        container.appendChild(this.input);

        if (this.helpText) {
            const help = document.createElement('p');
            help.className = 'help-text';
            help.textContent = this.helpText;
            container.appendChild(help);
        }

        this.appendChild(container);
    }

    protected updateContent() {
        if (this.input && this.value !== null) {
            this.input.value = String(this.value);
        }
    }

    protected attachEvents() {
        this.input.addEventListener('input', () => {
            this.value = parseFloat(this.input.value);
            this.dispatchInputEvent();
        });

        this.input.addEventListener('change', () => {
            this.value = parseFloat(this.input.value);
            this.dispatchChangeEvent();
        });
    }
}

// ==========================================
// Tag Input Component (WebComponent)
// ==========================================
class TagInputComponent extends BaseComponent {
    private tagsList!: HTMLElement;
    private input!: HTMLInputElement;
    private placeholder?: string;
    private delimiter: string = '\n';
    private tags: string[] = [];
    private hasRendered: boolean = false;

    static get observedAttributes() {
        return ['placeholder', 'value', 'delimiter'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'placeholder') this.placeholder = newValue;
        if (name === 'delimiter') this.delimiter = newValue;
        if (name === 'value') {
            this.tags = newValue ? newValue.split(this.delimiter).filter(t => t.trim()) : [];
            // Only render tags if the component has been rendered
            if (this.tagsList) {
                this.renderTags();
            }
        }
    }

    protected updateContent() {
        // Parse the value and update tags when setData is called
        if (this.value !== null && this.value !== undefined) {
            this.tags = String(this.value).split(this.delimiter).filter(t => t.trim());
            if (this.tagsList) {
                this.renderTags();
            }
        }
    }

    protected render() {
        // Only render once to prevent duplication
        if (this.hasRendered) {
            return;
        }
        this.hasRendered = true;

        const container = document.createElement('div');
        container.className = 'tag-input-container';

        this.tagsList = document.createElement('div');
        this.tagsList.className = 'tags-list';

        this.input = document.createElement('input');
        this.input.type = 'text';
        if (this.placeholder) this.input.placeholder = this.placeholder;
        this.input.autocomplete = 'off';

        container.appendChild(this.tagsList);
        container.appendChild(this.input);

        this.appendChild(container);

        // Focus handling
        container.addEventListener('click', () => {
            this.input.focus();
        });

        this.renderTags();
    }

    private renderTags() {
        if (!this.tagsList) return;
        
        this.tagsList.innerHTML = '';
        this.tags.forEach((tag, index) => {
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
            this.tagsList.appendChild(tagEl);
        });

        this.value = this.tags.join(this.delimiter);
    }

    private addTag(text: string) {
        const value = text.trim();
        if (value && !this.tags.includes(value)) {
            this.tags.push(value);
            this.input.value = '';
            this.renderTags();
            this.dispatchInputEvent();
        } else {
            this.input.value = '';
        }
    }

    private removeTag(index: number) {
        this.tags.splice(index, 1);
        this.renderTags();
        this.dispatchInputEvent();
    }

    public setTags(tags: string[]) {
        this.tags = tags;
        this.renderTags();
    }

    public getTags(): string[] {
        return [...this.tags];
    }

    protected attachEvents() {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                this.addTag(this.input.value);
            } else if (e.key === 'Backspace' && this.input.value === '' && this.tags.length > 0) {
                this.removeTag(this.tags.length - 1);
            }
        });
    }
}

// ==========================================
// Config Card Component
// ==========================================
class ConfigCard extends BaseComponent {
    private container!: HTMLElement;
    private toggle!: ToggleSwitch | null;
    private content!: HTMLElement;
    private cardTitle?: string;
    private toggleEnabled: boolean = true;
    private hasRendered: boolean = false;
    private originalChildren: Element[] = [];

    static get observedAttributes() {
        return ['card-title', 'toggle-enabled', 'expanded'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'card-title') this.cardTitle = newValue;
        if (name === 'toggle-enabled') this.toggleEnabled = newValue !== 'false';
        if (name === 'expanded') {
            if (!this.content) return;
            if (newValue !== null) {
                this.content.classList.add('visible');
            } else {
                this.content.classList.remove('visible');
            }
        }
    }

    protected render() {
        // Only render once to prevent duplication
        if (this.hasRendered) {
            return;
        }
        this.hasRendered = true;

        this.container = document.createElement('div');
        this.container.className = 'card';

        if (this.toggleEnabled) {
            // Create toggle switch
            this.toggle = new ToggleSwitch();
            if (this.cardTitle) {
                this.toggle.setAttribute('label', this.cardTitle);
            }
            this.container.appendChild(this.toggle);
        }

        this.content = document.createElement('div');
        this.content.className = 'card-content collapsible';

        // Store original children and move them to content div
        this.originalChildren = Array.from(this.children);
        this.originalChildren.forEach(child => {
            this.content.appendChild(child);
        });

        this.container.appendChild(this.content);
        this.appendChild(this.container);
    }

    protected updateContent() {
        // Handled by child components
    }

    protected attachEvents() {
        if (this.toggle) {
            this.toggle.addEventListener('change', (e: Event) => {
                const customEvent = e as CustomEvent;
                const isChecked = customEvent.detail?.value !== undefined ? customEvent.detail.value : (e.target as HTMLInputElement)?.checked;
                if (isChecked) {
                    this.content?.classList.add('visible');
                } else {
                    this.content?.classList.remove('visible');
                }
                this.dispatchChangeEvent();
            });
        }
    }

    public getToggle(): ToggleSwitch | null {
        return this.toggle;
    }

    public getContent(): HTMLElement {
        return this.content;
    }
}

// ==========================================
// Register Components
// ==========================================
export function registerComponents() {
    customElements.define('raw-toggle', ToggleSwitch);
    customElements.define('raw-text-input', TextInput);
    customElements.define('raw-number-input', NumberInput);
    customElements.define('raw-tag-input', TagInputComponent);
    customElements.define('raw-config-card', ConfigCard);
}

// Export for type checking
export {
    ToggleSwitch,
    TextInput,
    NumberInput,
    TagInputComponent,
    ConfigCard
};
