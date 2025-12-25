// Export all custom elements
export { BaseElement } from './base-element.js';
export { PatternController, connectToController, subscribeToState } from './pattern-controller.js';
export { SwitchToggle } from './switch-toggle.js';
export { Card } from './card.js';
export { TabContainer } from './tab-container.js';
export { TagInput } from './tag-input.js';

// Register all custom elements when this module is imported
export function registerAllComponents(): void {
    // Components are already registered in their respective files
    // This function ensures they're all loaded
    console.log('All popup components registered');
}