const fs = require('fs');
const path = require('path');
const http = require('http');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { renderLayoutDocument } = require('../../out/render/jrxmlRenderer');

function generateHarnessHtml(jrxmlContent, customOptions = {}) {
    const doc = parseJrxmlDocument(jrxmlContent);
    const layout = layoutJrxmlDocument(doc);
    const renderedCanvas = renderLayoutDocument(layout);
    const reportData = doc.report;

    const previewCssPath = path.join(__dirname, '..', '..', 'media', 'preview.css');
    const previewCss = fs.readFileSync(previewCssPath, 'utf8');

    const previewJsPath = path.join(__dirname, '..', '..', 'media', 'preview.js');
    const previewJs = fs.readFileSync(previewJsPath, 'utf8');

    const showWorkbench = customOptions.showWorkbench !== false;

    const webviewBody = `
        <div id="app">
            <div class="toolbar">
                <div class="toolbar-section">
                    <span class="toolbar-title">📄 ${layout.reportName || reportData.name}</span>
                    <span class="toolbar-info">${layout.pageWidth}×${layout.pageHeight} (Content: ${layout.contentWidth}×${layout.contentHeight})</span>
                </div>
                <div class="toolbar-section">
                    <button id="zoomOut" class="toolbar-btn">−</button>
                    <select id="zoomPreset" class="toolbar-select" title="Zoom Presets">
                        <option value="fit-width" selected>Fit Width</option>
                        <option value="fit-page">Fit Page</option>
                        <option value="0.5">50%</option>
                        <option value="0.75">75%</option>
                        <option value="1">100%</option>
                        <option value="1.25">125%</option>
                        <option value="1.5">150%</option>
                        <option value="2">200%</option>
                        <option value="custom" disabled hidden>Custom</option>
                    </select>
                    <span id="zoomLevel">Fit Width</span>
                    <button id="zoomIn" class="toolbar-btn">+</button>
                    <button id="exportHtml" class="toolbar-btn">📄 Export HTML</button>
                    <button id="toggleProps" class="toolbar-btn">🔧 Properties</button>
                </div>
            </div>
            
            <div class="sidebar">
                <h3>Report Info</h3>
                <div class="info-group">
                    <div class="info-item"><strong>Name:</strong> ${layout.reportName || reportData.name}</div>
                    <div class="info-item"><strong>Page:</strong> ${layout.pageWidth}×${layout.pageHeight}</div>
                    <div class="info-item"><strong>Content:</strong> ${layout.contentWidth}×${layout.contentHeight}</div>
                    <div class="info-item"><strong>Margins:</strong> L:${layout.margins.left} R:${layout.margins.right} T:${layout.margins.top} B:${layout.margins.bottom}</div>
                    <div class="info-item"><strong>Pages:</strong> ${layout.totalPages}</div>
                </div>
                
                ${reportData.parameters.length > 0 ? `
                <h3>Parameters (${reportData.parameters.length})</h3>
                <div class="info-group">
                    ${reportData.parameters.map((p) => `
                        <div class="info-item">
                            <strong>${p.name}</strong>
                            <div class="info-detail">${p.class}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${reportData.fields.length > 0 ? `
                <h3>Fields (${reportData.fields.length})</h3>
                <div class="info-group">
                    ${reportData.fields.map((f) => `
                        <div class="info-item">
                            <strong>${f.name}</strong>
                            <div class="info-detail">${f.class}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${reportData.variables.length > 0 ? `
                <h3>Variables (${reportData.variables.length})</h3>
                <div class="info-group">
                    ${reportData.variables.map((v) => `
                        <div class="info-item">
                            <strong>${v.name}</strong>
                            <div class="info-detail">${v.class} (${v.calculation})</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            <div class="preview-container">
                <div id="canvas" class="report-canvas-wrapper" style="transform-origin: top center; transition: transform 0.2s ease;">
                    ${renderedCanvas}
                </div>
            </div>
            
            <div id="propertiesPanel" class="properties-panel">
                <div class="properties-header">
                    <h3>Properties</h3>
                    <button id="closeProps" class="close-btn">✕</button>
                </div>
                <div id="propertiesContent" class="properties-content">
                    <p>Click on an element to see its properties</p>
                </div>
            </div>
        </div>
    `;

    if (!showWorkbench) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JRXML Preview</title>
    <style>${previewCss}</style>
</head>
<body>
    ${webviewBody}
    <script>
        window.layoutResult = ${JSON.stringify(layout)};
    </script>
    <script>${previewJs}</script>
</body>
</html>`;
    }

    const workbenchCss = `
        :root {
            --vscode-bg: #1e1e1e;
            --vscode-sidebar-bg: #252526;
            --vscode-activitybar-bg: #333333;
            --vscode-editor-bg: #1e1e1e;
            --vscode-tab-active-bg: #1e1e1e;
            --vscode-tab-inactive-bg: #2d2d2d;
            --vscode-statusbar-bg: #007acc;
            --vscode-border: #3c3c3c;
            --vscode-tree-hover: #2a2d2e;
            --vscode-text: #cccccc;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--vscode-bg);
            color: var(--vscode-text);
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .workbench-layout {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        .activity-bar {
            width: 48px;
            background: var(--vscode-activitybar-bg);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 8px;
            gap: 16px;
            flex-shrink: 0;
            border-right: 1px solid var(--vscode-border);
        }
        .activity-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 4px;
            color: #858585;
            font-size: 18px;
        }
        .activity-icon.active {
            color: #ffffff;
            border-left: 2px solid #ffffff;
        }
        .primary-sidebar {
            width: 260px;
            background: var(--vscode-sidebar-bg);
            border-right: 1px solid var(--vscode-border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            overflow-y: auto;
        }
        .sidebar-title {
            padding: 10px 16px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #bbbbbb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .tree-section {
            border-top: 1px solid #333333;
        }
        .tree-header {
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #888888;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .tree-header:hover {
            background: var(--vscode-tree-hover);
        }
        .tree-item {
            padding: 4px 16px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: #cccccc;
        }
        .tree-item:hover, .tree-item.active {
            background: var(--vscode-tree-hover);
            color: #ffffff;
        }
        .tree-item .badge {
            margin-left: auto;
            font-size: 10px;
            color: #858585;
        }
        .editor-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--vscode-editor-bg);
            overflow: hidden;
        }
        .editor-tabs {
            height: 35px;
            background: var(--vscode-tab-inactive-bg);
            display: flex;
            align-items: center;
            border-bottom: 1px solid #252526;
            flex-shrink: 0;
        }
        .editor-tab {
            height: 100%;
            padding: 0 16px;
            background: var(--vscode-tab-active-bg);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #ffffff;
            border-top: 2px solid #007acc;
            cursor: pointer;
        }
        .editor-tab .close-tab {
            font-size: 11px;
            color: #858585;
            margin-left: 8px;
        }
        .editor-tab-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 12px;
            padding-right: 16px;
            color: #858585;
            font-size: 13px;
            cursor: pointer;
        }
        .webview-wrapper {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        .status-bar {
            height: 24px;
            background: var(--vscode-statusbar-bg);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            font-size: 12px;
            flex-shrink: 0;
        }
        .status-left, .status-right {
            display: flex;
            align-items: center;
            gap: 16px;
        }
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VS Code - complex-report.jrxml - JRXML Viewer & Editor</title>
    <style>
        ${workbenchCss}
        ${previewCss}
    </style>
</head>
<body>
    <div class="workbench-layout">
        <div class="activity-bar">
            <div class="activity-icon active" title="JRXML Explorer">📊</div>
            <div class="activity-icon" title="Explorer">📁</div>
            <div class="activity-icon" title="Search">🔍</div>
            <div class="activity-icon" title="Source Control">🌿</div>
            <div class="activity-icon" title="Extensions">🧩</div>
        </div>
        
        <div class="primary-sidebar" id="jrxmlExplorerSidebar">
            <div class="sidebar-title">
                <span>JRXML Explorer</span>
                <span title="Refresh">↻</span>
            </div>
            
            <div class="tree-section">
                <div class="tree-header">▾ JRXML FILES</div>
                <div class="tree-item active">
                    <span>📄</span>
                    <span>complex-report.jrxml</span>
                    <span class="badge">A4</span>
                </div>
            </div>
            
            <div class="tree-section">
                <div class="tree-header">▾ DOCUMENT PROPERTIES</div>
                <div class="tree-item">
                    <span>📐</span>
                    <span>Dimensions: ${layout.pageWidth} × ${layout.pageHeight}</span>
                </div>
                <div class="tree-item">
                    <span>📑</span>
                    <span>Bands: ${doc.report.bands.length}</span>
                </div>
                <div class="tree-item">
                    <span>🧩</span>
                    <span>Elements: ${layout.pages.reduce((acc, p) => acc + p.bands.reduce((bAcc, b) => bAcc + b.elements.length, 0), 0)}</span>
                </div>
                <div class="tree-item">
                    <span>🎨</span>
                    <span>Styles: ${doc.report.styles.length}</span>
                </div>
                <div class="tree-item">
                    <span>⚙️</span>
                    <span>Parameters: ${doc.report.parameters.length}</span>
                </div>
                <div class="tree-item">
                    <span>🔢</span>
                    <span>Variables: ${doc.report.variables.length}</span>
                </div>
            </div>
            
            <div class="tree-section" id="elementsTreeSection">
                <div class="tree-header">▾ ELEMENTS NAVIGATOR</div>
                ${doc.report.bands.map(b => `
                    <div class="tree-item" style="padding-left: 20px; font-weight: 600; color: #4ec9b0;">
                        <span>▾</span>
                        <span>Band: ${b.type}</span>
                        <span class="badge">${b.height}px</span>
                    </div>
                    ${b.elements.slice(0, 4).map(e => `
                        <div class="tree-item" style="padding-left: 36px; font-size: 11px;" data-tree-element="${e.id}">
                            <span>${e.type === 'staticText' ? '📝' : e.type === 'textField' ? '🏷️' : e.type === 'chart' ? '📊' : e.type === 'frame' ? '🖼️' : '◻️'}</span>
                            <span>${e.type}${e.chartType ? ` (${e.chartType})` : ''}</span>
                            <span class="badge">${e.geometry.width}×${e.geometry.height}</span>
                        </div>
                    `).join('')}
                `).join('')}
            </div>
        </div>
        
        <div class="editor-container">
            <div class="editor-tabs">
                <div class="editor-tab">
                    <span>📊</span>
                    <span>complex-report.jrxml (Visual Editor)</span>
                    <span class="close-tab">✕</span>
                </div>
                <div class="editor-tab-actions">
                    <span title="Open JRXML Source">&lt;/&gt;</span>
                    <span title="Split Editor">◫</span>
                    <span title="More Actions">⋯</span>
                </div>
            </div>
            
            <div class="webview-wrapper">
                ${webviewBody}
            </div>
        </div>
    </div>
    
    <div class="status-bar">
        <div class="status-left">
            <span>🌿 main</span>
            <span>✓ 0 errors, 0 warnings</span>
            <span>JRXML Viewer & Editor v0.2.0</span>
        </div>
        <div class="status-right">
            <span>UTF-8</span>
            <span>JasperReports 6.x</span>
            <span>Ready</span>
        </div>
    </div>

    <script>
        window.acquireVsCodeApi = function() {
            return {
                postMessage: function(msg) {
                    window.__lastMessage = msg;
                    window.dispatchEvent(new CustomEvent('vscode-message', { detail: msg }));
                },
                getState: function() { return {}; },
                setState: function() {}
            };
        };
        window.layoutResult = ${JSON.stringify(layout)};
    </script>
    <script>${previewJs}</script>
</body>
</html>`;
}

function startHarnessServer(jrxmlContent, options = {}) {
    const port = options.port || 9876;
    const html = generateHarnessHtml(jrxmlContent, options);

    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        });

        server.listen(port, () => {
            resolve({
                server,
                port,
                url: `http://localhost:${port}`
            });
        });

        server.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = {
    generateHarnessHtml,
    startHarnessServer
};
