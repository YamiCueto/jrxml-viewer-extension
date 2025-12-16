(function() {
    const vscode = acquireVsCodeApi();
    
    let currentZoom = 1.0;
    const zoomStep = 0.1;
    const minZoom = 0.25;
    const maxZoom = 3.0;
    let selectedElement = null;

    // Initialize zoom controls
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    const canvas = document.getElementById('canvas');
    const exportHtmlBtn = document.getElementById('exportHtml');
    const togglePropsBtn = document.getElementById('toggleProps');
    const closePropsBtn = document.getElementById('closeProps');
    const propertiesPanel = document.getElementById('propertiesPanel');
    const propertiesContent = document.getElementById('propertiesContent');

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

    function updateZoom() {
        if (canvas) {
            canvas.style.transform = `scale(${currentZoom})`;
        }
        if (zoomLevelSpan) {
            zoomLevelSpan.textContent = `${Math.round(currentZoom * 100)}%`;
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
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
    const elements = document.querySelectorAll('.element.clickable');
    elements.forEach(element => {
        element.addEventListener('click', (e) => {
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
                    const data = JSON.parse(elementData.replace(/&apos;/g, "'"));
                    showElementProperties(data);
                    propertiesPanel.classList.add('visible');
                } catch (error) {
                    console.error('Error parsing element data:', error);
                }
            }
        });
    });

    // Click outside to deselect
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.element') && !e.target.closest('.properties-panel')) {
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement = null;
            }
        }
    });

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
        html += `<div class="property-item">
            <span class="property-label">X:</span>
            <span class="property-value">${data.x}px</span>
        </div>`;
        html += `<div class="property-item">
            <span class="property-label">Y:</span>
            <span class="property-value">${data.y}px</span>
        </div>`;
        html += `<div class="property-item">
            <span class="property-label">Width:</span>
            <span class="property-value">${data.width}px</span>
        </div>`;
        html += `<div class="property-item">
            <span class="property-label">Height:</span>
            <span class="property-value">${data.height}px</span>
        </div>`;
        html += '</div>';

        if (data.text || data.expression || data.pattern || data.textAlignment || data.verticalAlignment) {
            html += '<div class="property-group">';
            html += '<h4>Content</h4>';
            
            if (data.text) {
                html += `<div class="property-item">
                    <span class="property-label">Text:</span>
                    <span class="property-value">${data.text}</span>
                </div>`;
            }
            
            if (data.expression) {
                html += `<div class="property-item">
                    <span class="property-label">Expression:</span>
                    <span class="property-value">${data.expression}</span>
                </div>`;
            }
            
            if (data.pattern) {
                html += `<div class="property-item">
                    <span class="property-label">Pattern:</span>
                    <span class="property-value">${data.pattern}</span>
                </div>`;
            }
            
            if (data.textAlignment) {
                html += `<div class="property-item">
                    <span class="property-label">Text Align:</span>
                    <span class="property-value">${data.textAlignment}</span>
                </div>`;
            }
            
            if (data.verticalAlignment) {
                html += `<div class="property-item">
                    <span class="property-label">Vertical Align:</span>
                    <span class="property-value">${data.verticalAlignment}</span>
                </div>`;
            }
            
            html += '</div>';
        }

        if (data.fontName || data.fontSize || data.isBold) {
            html += '<div class="property-group">';
            html += '<h4>Font</h4>';
            
            if (data.fontName) {
                html += `<div class="property-item">
                    <span class="property-label">Font Name:</span>
                    <span class="property-value">${data.fontName}</span>
                </div>`;
            }
            
            if (data.fontSize) {
                html += `<div class="property-item">
                    <span class="property-label">Font Size:</span>
                    <span class="property-value">${data.fontSize}pt</span>
                </div>`;
            }
            
            if (data.isBold) {
                html += `<div class="property-item">
                    <span class="property-label">Bold:</span>
                    <span class="property-value">Yes</span>
                </div>`;
            }
            
            html += '</div>';
        }

        if (data.forecolor || data.backcolor || data.mode) {
            html += '<div class="property-group">';
            html += '<h4>Appearance</h4>';
            
            if (data.forecolor) {
                html += `<div class="property-item">
                    <span class="property-label">Foreground:</span>
                    <span class="property-value">${data.forecolor}</span>
                </div>`;
            }
            
            if (data.backcolor) {
                html += `<div class="property-item">
                    <span class="property-label">Background:</span>
                    <span class="property-value">${data.backcolor}</span>
                </div>`;
            }
            
            if (data.mode) {
                html += `<div class="property-item">
                    <span class="property-label">Mode:</span>
                    <span class="property-value">${data.mode}</span>
                </div>`;
            }
            
            html += '</div>';
        }

        propertiesContent.innerHTML = html;
    }

    // Mouse wheel zoom
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
        previewContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                
                if (e.deltaY < 0) {
                    // Scroll up - zoom in
                    currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
                } else {
                    // Scroll down - zoom out
                    currentZoom = Math.max(minZoom, currentZoom - zoomStep);
                }
                
                updateZoom();
            }
        }, { passive: false });
    }

    // Log report data for debugging
    if (window.reportData) {
        console.log('Report Data:', window.reportData);
    }

    // Initialize
    updateZoom();
})();
