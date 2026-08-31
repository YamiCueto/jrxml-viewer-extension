(function () {
    const vscode = acquireVsCodeApi();
    let zoomMode = 'fit-width';
    let currentZoom = 1.0;
    const zoomStep = 0.1;
    const minZoom = 0.2;
    const maxZoom = 4.0;
    let selectedElement = null;
    let currentElementData = null;
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomPresetSelect = document.getElementById('zoomPreset');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    const canvas = document.getElementById('canvas');
    const previewContainer = document.querySelector('.preview-container');
    const exportHtmlBtn = document.getElementById('exportHtml');
    const togglePropsBtn = document.getElementById('toggleProps');
    const closePropsBtn = document.getElementById('closeProps');
    const propertiesPanel = document.getElementById('propertiesPanel');
    const propertiesContent = document.getElementById('propertiesContent');
    function getReportDimensions() {
        const page = document.querySelector('.jrxml-page');
        if (page) {
            const width = parseFloat(page.style.width) || page.offsetWidth || 595;
            const height = parseFloat(page.style.height) || page.offsetHeight || 842;
            return { width, height };
        }
        return { width: 595, height: 842 };
    }
    function calculateFitWidth() {
        if (!previewContainer) {
            return 1.0;
        }
        const availableWidth = previewContainer.clientWidth - 80;
        const { width } = getReportDimensions();
        if (width <= 0) {
            return 1.0;
        }
        const scale = availableWidth / width;
        return Math.max(minZoom, Math.min(maxZoom, Math.round(scale * 100) / 100));
    }
    function calculateFitPage() {
        if (!previewContainer) {
            return 1.0;
        }
        const availableWidth = previewContainer.clientWidth - 80;
        const availableHeight = previewContainer.clientHeight - 80;
        const { width, height } = getReportDimensions();
        if (width <= 0 || height <= 0) {
            return 1.0;
        }
        const scale = Math.min(availableWidth / width, availableHeight / height);
        return Math.max(minZoom, Math.min(maxZoom, Math.round(scale * 100) / 100));
    }
    function applyZoom(mode, customValue) {
        if (mode) {
            zoomMode = mode;
        }
        if (zoomMode === 'fit-width') {
            currentZoom = calculateFitWidth();
        }
        else if (zoomMode === 'fit-page') {
            currentZoom = calculateFitPage();
        }
        else if (customValue !== undefined) {
            currentZoom = Math.max(minZoom, Math.min(maxZoom, customValue));
        }
        updateZoomUI();
    }
    function updateZoomUI() {
        if (canvas) {
            canvas.style.transform = `scale(${currentZoom})`;
        }
        if (zoomLevelSpan) {
            zoomLevelSpan.textContent = `${Math.round(currentZoom * 100)}%`;
        }
        if (zoomPresetSelect) {
            if (zoomMode === 'fit-width') {
                zoomPresetSelect.value = 'fit-width';
            }
            else if (zoomMode === 'fit-page') {
                zoomPresetSelect.value = 'fit-page';
            }
            else {
                const rounded = (Math.round(currentZoom * 100) / 100).toString();
                const matchedOption = Array.from(zoomPresetSelect.options).find(opt => opt.value === rounded);
                if (matchedOption) {
                    zoomPresetSelect.value = rounded;
                }
                else {
                    zoomPresetSelect.value = 'custom';
                }
            }
        }
    }
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomMode = 'custom';
            currentZoom = Math.min(maxZoom, Math.round((currentZoom + zoomStep) * 100) / 100);
            updateZoomUI();
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomMode = 'custom';
            currentZoom = Math.max(minZoom, Math.round((currentZoom - zoomStep) * 100) / 100);
            updateZoomUI();
        });
    }
    if (zoomPresetSelect) {
        zoomPresetSelect.addEventListener('change', () => {
            const val = zoomPresetSelect.value;
            if (val === 'fit-width' || val === 'fit-page') {
                applyZoom(val);
            }
            else {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    applyZoom('custom', num);
                }
            }
        });
    }
    window.addEventListener('resize', () => {
        if (zoomMode === 'fit-width' || zoomMode === 'fit-page') {
            applyZoom();
        }
    });
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
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoomMode = 'custom';
            currentZoom = Math.min(maxZoom, Math.round((currentZoom + zoomStep) * 100) / 100);
            updateZoomUI();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoomMode = 'custom';
            currentZoom = Math.max(minZoom, Math.round((currentZoom - zoomStep) * 100) / 100);
            updateZoomUI();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            applyZoom('fit-width');
        }
        if (e.key === 'Escape') {
            propertiesPanel.classList.remove('visible');
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
            }
        }
    });
    function selectElement(element, scrollIntoView = false) {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
        }
        element.classList.add('selected');
        selectedElement = element;
        if (scrollIntoView) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
        const elementData = element.getAttribute('data-element');
        if (elementData) {
            try {
                const data = JSON.parse(elementData.replace(/&apos;/g, "'"));
                currentElementData = data;
                showElementProperties(data);
                propertiesPanel.classList.add('visible');
                vscode.postMessage({
                    command: 'elementSelected',
                    elementId: data.id || element.id,
                    elementData: data
                });
            }
            catch (error) {
                console.error('Error parsing element data:', error);
            }
        }
    }
    const elements = document.querySelectorAll('.element.clickable');
    elements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            selectElement(element, false);
        });
    });
    document.addEventListener('click', (e) => {
        if (!e.target || !e.target.closest('.element') && !e.target.closest('.properties-panel')) {
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
                currentElementData = null;
            }
        }
    });
    window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message) {
            return;
        }
        switch (message.command) {
            case 'selectElement': {
                const targetId = message.elementId;
                if (!targetId) {
                    return;
                }
                const targetEl = document.getElementById(targetId) || document.querySelector(`[data-element-id="${targetId}"]`);
                if (targetEl) {
                    selectElement(targetEl, true);
                }
                break;
            }
            case 'setZoom': {
                if (message.mode === 'fit-width' || message.mode === 'fit-page') {
                    applyZoom(message.mode);
                }
                else if (typeof message.value === 'number') {
                    applyZoom('custom', message.value);
                }
                break;
            }
        }
    });
    function createEditableField(label, value, property, type = 'text') {
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
    function createSelectField(label, value, property, options) {
        const optionsHtml = options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('');
        return `<div class="property-item editable">
            <span class="property-label">${label}:</span>
            <select class="property-select" data-property="${property}">
                <option value="">-- Select --</option>
                ${optionsHtml}
            </select>
        </div>`;
    }
    function createCheckboxField(label, value, property) {
        return `<div class="property-item editable">
            <span class="property-label">${label}:</span>
            <input type="checkbox" 
                   class="property-checkbox" 
                   data-property="${property}" 
                   ${value ? 'checked' : ''}>
        </div>`;
    }
    function showElementProperties(data) {
        let html = '<div class="property-group">';
        html += '<h4>Element Type</h4>';
        html += `<div class="property-item">
            <span class="property-label">Type:</span>
            <span class="property-value">${data.type}</span>
        </div>`;
        html += '</div>';
        html += '<div class="property-group">';
        html += '<h4>Position & Size</h4>';
        html += createEditableField('X', data.x, 'x', 'number');
        html += createEditableField('Y', data.y, 'y', 'number');
        html += createEditableField('Width', data.width, 'width', 'number');
        html += createEditableField('Height', data.height, 'height', 'number');
        html += '</div>';
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
            html += createSelectField('Text Align', data.textAlignment, 'textAlignment', ['Left', 'Center', 'Right', 'Justified']);
            html += createSelectField('Vertical Align', data.verticalAlignment, 'verticalAlignment', ['Top', 'Middle', 'Bottom']);
            html += '</div>';
        }
        if (data.type === 'staticText' || data.type === 'textField') {
            html += '<div class="property-group">';
            html += '<h4>Font</h4>';
            html += createEditableField('Font Name', data.fontName, 'fontName', 'text');
            html += createEditableField('Font Size', data.fontSize, 'fontSize', 'number');
            html += createCheckboxField('Bold', data.isBold, 'isBold');
            html += '</div>';
        }
        html += '<div class="property-group">';
        html += '<h4>Appearance</h4>';
        html += createEditableField('Forecolor', data.forecolor, 'forecolor', 'color');
        html += createEditableField('Backcolor', data.backcolor, 'backcolor', 'color');
        html += createSelectField('Mode', data.mode, 'mode', ['Opaque', 'Transparent']);
        html += '</div>';
        html += '<div class="property-actions">';
        html += '<button id="saveProperties" class="save-btn">💾 Save Changes</button>';
        html += '</div>';
        propertiesContent.innerHTML = html;
        setupPropertyListeners();
    }
    function setupPropertyListeners() {
        const inputs = propertiesContent.querySelectorAll('.property-input');
        inputs.forEach(input => {
            input.addEventListener('change', handlePropertyChange);
            input.addEventListener('input', handlePropertyPreview);
        });
        const selects = propertiesContent.querySelectorAll('.property-select');
        selects.forEach(select => {
            select.addEventListener('change', handlePropertyChange);
        });
        const checkboxes = propertiesContent.querySelectorAll('.property-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handlePropertyChange);
        });
        const saveBtn = document.getElementById('saveProperties');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveAllProperties);
        }
    }
    function handlePropertyChange(e) {
        const target = e.target;
        const property = target.dataset.property;
        if (!property || !currentElementData) {
            return;
        }
        let value;
        if (target.type === 'checkbox') {
            value = target.checked;
        }
        else if (target.type === 'number') {
            value = parseInt(target.value, 10) || 0;
        }
        else {
            value = target.value;
        }
        currentElementData[property] = value;
        updateElementVisual(property, value);
    }
    function handlePropertyPreview(e) {
        const target = e.target;
        const property = target.dataset.property;
        if (!property || !selectedElement) {
            return;
        }
        if (['x', 'y', 'width', 'height'].includes(property)) {
            const value = parseInt(target.value, 10) || 0;
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
    function updateElementVisual(property, value) {
        if (!selectedElement) {
            return;
        }
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
                    content.textContent = value;
                }
                break;
            case 'forecolor':
                selectedElement.style.color = value;
                break;
            case 'backcolor':
                selectedElement.style.backgroundColor = value;
                break;
            case 'fontSize':
                selectedElement.style.fontSize = `${value}px`;
                break;
            case 'isBold':
                selectedElement.style.fontWeight = value ? 'bold' : 'normal';
                break;
            case 'textAlignment':
                selectedElement.style.textAlign = value.toLowerCase();
                break;
        }
        if (currentElementData) {
            selectedElement.setAttribute('data-element', JSON.stringify(currentElementData).replace(/'/g, '&apos;'));
        }
    }
    function saveAllProperties() {
        if (!currentElementData) {
            vscode.postMessage({ command: 'alert', text: 'No element selected' });
            return;
        }
        vscode.postMessage({
            command: 'updateElement',
            elementData: currentElementData
        });
    }
    applyZoom('fit-width');
})();
//# sourceMappingURL=preview.js.map