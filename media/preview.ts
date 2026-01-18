declare function acquireVsCodeApi(): {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

interface ElementData {
    id?: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    expression?: string;
    pattern?: string;
    textAlignment?: string;
    verticalAlignment?: string;
    fontName?: string;
    fontSize?: number;
    isBold?: boolean;
    forecolor?: string;
    backcolor?: string;
    mode?: string;
    bandType?: string;
    bandIndex?: number;
    elementIndex?: number;
}

(function() {
    const vscode = acquireVsCodeApi();

    let currentZoom: number = 1.0;
    const zoomStep: number = 0.1;
    const minZoom: number = 0.25;
    const maxZoom: number = 3.0;
    let selectedElement: HTMLElement | null = null;
    let currentElementData: ElementData | null = null;

    // Initialize zoom controls
    const zoomInBtn = document.getElementById('zoomIn') as HTMLButtonElement;
    const zoomOutBtn = document.getElementById('zoomOut') as HTMLButtonElement;
    const zoomLevelSpan = document.getElementById('zoomLevel') as HTMLSpanElement;
    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const exportHtmlBtn = document.getElementById('exportHtml') as HTMLButtonElement;
    const togglePropsBtn = document.getElementById('toggleProps') as HTMLButtonElement;
    const closePropsBtn = document.getElementById('closeProps') as HTMLButtonElement;
    const propertiesPanel = document.getElementById('propertiesPanel') as HTMLDivElement;
    const propertiesContent = document.getElementById('propertiesContent') as HTMLDivElement;

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
        });
    }

    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'exportHtml' });
        });
    }

    if (togglePropsBtn) {
        togglePropsBtn.addEventListener('click', () => {
            propertiesPanel.classList.toggle('visible');
        });
    }

    if (closePropsBtn) {
        closePropsBtn.addEventListener('click', () => {
            propertiesPanel.classList.remove('visible');
        });
    }

    function updateZoom(): void {
        if (canvas) {
            canvas.style.transform = `scale(${currentZoom})`;
        }
        if (zoomLevelSpan) {
            zoomLevelSpan.textContent = `${Math.round(currentZoom * 100)}%`;
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // Ctrl/Cmd + Plus: Zoom in
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        }
        
        // Ctrl/Cmd + Minus: Zoom out
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
        }
        
        // Ctrl/Cmd + 0: Reset zoom
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            currentZoom = 1.0;
            updateZoom();
        }

        // Escape: Close properties panel
        if (e.key === 'Escape') {
            propertiesPanel.classList.remove('visible');
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
            }
        }
    });

    // Add click handlers for elements
    const elements = document.querySelectorAll('.element.clickable') as NodeListOf<HTMLElement>;
    elements.forEach(element => {
        element.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            
            // Remove previous selection
            if (selectedElement) {
                selectedElement.classList.remove('selected');
            }
            
            // Add selection to clicked element
            element.classList.add('selected');
            selectedElement = element;
            
            // Get element data
            const elementData = element.getAttribute('data-element');
            if (elementData) {
                try {
                    const data = JSON.parse(elementData.replace(/&apos;/g, "'")) as ElementData;
                    currentElementData = data;
                    showElementProperties(data);
                    propertiesPanel.classList.add('visible');
                } catch (error) {
                    console.error('Error parsing element data:', error);
                }
            }
        });
    });

    // Click outside to deselect
    document.addEventListener('click', (e: MouseEvent) => {
        if (!e.target || !(e.target as HTMLElement).closest('.element') && !(e.target as HTMLElement).closest('.properties-panel')) {
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
                currentElementData = null;
            }
        }
    });

    function createEditableField(label: string, value: string | number | undefined, property: string, type: 'text' | 'number' | 'color' = 'text'): string {
        const inputType = type === 'color' ? 'color' : (type === 'number' ? 'number' : 'text');
        const inputValue = value !== undefined ? value : '';
        const colorPreview = type === 'color' && value ? `<span class="color-preview" style="background-color: ${value}"></span>` : '';
        
        return `<div class="property-item editable">
            <span class="property-label">${label}:</span>
            <div class="property-input-container">
                ${colorPreview}
                <input type="${inputType}" 
                       class="property-input" 
                       data-property="${property}" 
                       value="${inputValue}"
                       ${type === 'number' ? 'min="0"' : ''}>
            </div>
        </div>`;
    }

    function createSelectField(label: string, value: string | undefined, property: string, options: string[]): string {
        const optionsHtml = options.map(opt => 
            `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`
        ).join('');
        
        return `<div class="property-item editable">
            <span class="property-label">${label}:</span>
            <select class="property-select" data-property="${property}">
                <option value="">-- Select --</option>
                ${optionsHtml}
            </select>
        </div>`;
    }

    function createCheckboxField(label: string, value: boolean | undefined, property: string): string {
        return `<div class="property-item editable">
            <span class="property-label">${label}:</span>
            <input type="checkbox" 
                   class="property-checkbox" 
                   data-property="${property}" 
                   ${value ? 'checked' : ''}>
        </div>`;
    }

    function showElementProperties(data: ElementData): void {
        let html = '<div class="property-group">';
        html += '<h4>Element Type</h4>';
        html += `<div class="property-item">
            <span class="property-label">Type:</span>
            <span class="property-value">${data.type}</span>
        </div>`;
        html += '</div>';

        // Position & Size (editable)
        html += '<div class="property-group">';
        html += '<h4>Position & Size</h4>';
        html += createEditableField('X', data.x, 'x', 'number');
        html += createEditableField('Y', data.y, 'y', 'number');
        html += createEditableField('Width', data.width, 'width', 'number');
        html += createEditableField('Height', data.height, 'height', 'number');
        html += '</div>';

        // Content section (editable)
        if (data.type === 'staticText' || data.type === 'textField') {
            html += '<div class="property-group">';
            html += '<h4>Content</h4>';
            
            if (data.type === 'staticText') {
                html += createEditableField('Text', data.text, 'text', 'text');
            }
            
            if (data.type === 'textField') {
                html += createEditableField('Expression', data.expression, 'expression', 'text');
                html += createEditableField('Pattern', data.pattern, 'pattern', 'text');
            }
            
            html += createSelectField('Text Align', data.textAlignment, 'textAlignment', 
                ['Left', 'Center', 'Right', 'Justified']);
            html += createSelectField('Vertical Align', data.verticalAlignment, 'verticalAlignment', 
                ['Top', 'Middle', 'Bottom']);
            
            html += '</div>';
        }

        // Font section (editable)
        if (data.type === 'staticText' || data.type === 'textField') {
            html += '<div class="property-group">';
            html += '<h4>Font</h4>';
            html += createEditableField('Font Name', data.fontName, 'fontName', 'text');
            html += createEditableField('Font Size', data.fontSize, 'fontSize', 'number');
            html += createCheckboxField('Bold', data.isBold, 'isBold');
            html += '</div>';
        }

        // Appearance section (editable)
        html += '<div class="property-group">';
        html += '<h4>Appearance</h4>';
        html += createEditableField('Forecolor', data.forecolor, 'forecolor', 'color');
        html += createEditableField('Backcolor', data.backcolor, 'backcolor', 'color');
        html += createSelectField('Mode', data.mode, 'mode', ['Opaque', 'Transparent']);
        html += '</div>';

        // Save button
        html += '<div class="property-actions">';
        html += '<button id="saveProperties" class="save-btn">💾 Save Changes</button>';
        html += '</div>';

        propertiesContent.innerHTML = html;

        // Add event listeners for property changes
        setupPropertyListeners();
    }

    function setupPropertyListeners(): void {
        // Input fields
        const inputs = propertiesContent.querySelectorAll('.property-input') as NodeListOf<HTMLInputElement>;
        inputs.forEach(input => {
            input.addEventListener('change', handlePropertyChange);
            input.addEventListener('input', handlePropertyPreview);
        });

        // Select fields
        const selects = propertiesContent.querySelectorAll('.property-select') as NodeListOf<HTMLSelectElement>;
        selects.forEach(select => {
            select.addEventListener('change', handlePropertyChange);
        });

        // Checkbox fields
        const checkboxes = propertiesContent.querySelectorAll('.property-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handlePropertyChange);
        });

        // Save button
        const saveBtn = document.getElementById('saveProperties');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveAllProperties);
        }
    }

    function handlePropertyChange(e: Event): void {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        const property = target.dataset.property;
        if (!property || !currentElementData) return;

        let value: string | number | boolean;
        
        if (target.type === 'checkbox') {
            value = (target as HTMLInputElement).checked;
        } else if (target.type === 'number') {
            value = parseInt(target.value) || 0;
        } else {
            value = target.value;
        }

        // Update local data
        (currentElementData as any)[property] = value;

        // Update visual preview immediately
        updateElementVisual(property, value);
    }

    function handlePropertyPreview(e: Event): void {
        const target = e.target as HTMLInputElement;
        const property = target.dataset.property;
        if (!property || !selectedElement) return;

        // Live preview for position and size
        if (['x', 'y', 'width', 'height'].includes(property)) {
            const value = parseInt(target.value) || 0;
            switch (property) {
                case 'x':
                    selectedElement.style.left = `${value}px`;
                    break;
                case 'y':
                    selectedElement.style.top = `${value}px`;
                    break;
                case 'width':
                    selectedElement.style.width = `${value}px`;
                    break;
                case 'height':
                    selectedElement.style.height = `${value}px`;
                    break;
            }
        }
    }

    function updateElementVisual(property: string, value: string | number | boolean): void {
        if (!selectedElement) return;

        switch (property) {
            case 'x':
                selectedElement.style.left = `${value}px`;
                break;
            case 'y':
                selectedElement.style.top = `${value}px`;
                break;
            case 'width':
                selectedElement.style.width = `${value}px`;
                break;
            case 'height':
                selectedElement.style.height = `${value}px`;
                break;
            case 'text':
            case 'expression':
                const content = selectedElement.querySelector('.element-content');
                if (content) {
                    content.textContent = value as string;
                }
                break;
            case 'forecolor':
                selectedElement.style.color = value as string;
                break;
            case 'backcolor':
                selectedElement.style.backgroundColor = value as string;
                break;
            case 'fontSize':
                selectedElement.style.fontSize = `${value}px`;
                break;
            case 'isBold':
                selectedElement.style.fontWeight = value ? 'bold' : 'normal';
                break;
            case 'textAlignment':
                selectedElement.style.textAlign = (value as string).toLowerCase();
                break;
        }

        // Update the data attribute
        if (currentElementData) {
            selectedElement.setAttribute('data-element', JSON.stringify(currentElementData).replace(/'/g, '&apos;'));
        }
    }

    function saveAllProperties(): void {
        if (!currentElementData) {
            vscode.postMessage({ command: 'alert', text: 'No element selected' });
            return;
        }

        // Send update to VS Code
        vscode.postMessage({
            command: 'updateElement',
            elementData: currentElementData
        });
    }

    // Initialize
    updateZoom();
})();