import * as vscode from 'vscode';
import * as path from 'path';
import { parseJrxml, JrxmlReport } from './jrxmlParser';

export class JrxmlEditorProvider implements vscode.CustomReadonlyEditorProvider {
    private static readonly viewType = 'jrxml-viewer.editor';

    constructor(private readonly context: vscode.ExtensionContext) {}

    async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
        return { uri, dispose: () => {} };
    }

    async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Configure webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        // Load and parse the JRXML file
        const jrxmlContent = await vscode.workspace.fs.readFile(document.uri);
        const jrxmlText = Buffer.from(jrxmlContent).toString('utf8');
        
        let reportData: JrxmlReport | null = null;
        let parseError: string | null = null;

        try {
            reportData = parseJrxml(jrxmlText);
        } catch (error) {
            parseError = error instanceof Error ? error.message : 'Unknown parsing error';
            console.error('Error parsing JRXML:', error);
        }

        // Set webview HTML
        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            reportData,
            parseError
        );

        // Handle messages from webview
        webviewPanel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    case 'exportHtml':
                        this.exportToHtml(reportData, document.uri);
                        break;
                    case 'editElement':
                        vscode.window.showInformationMessage(`Editing: ${message.elementType} at (${message.x}, ${message.y})`);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private getHtmlForWebview(
        webview: vscode.Webview,
        reportData: JrxmlReport | null,
        parseError: string | null
    ): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'preview.js'))
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'preview.css'))
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>JRXML Preview</title>
</head>
<body>
    <div id="app">
        ${parseError ? this.getErrorHtml(parseError) : this.getReportHtml(reportData!)}
    </div>
    <script nonce="${nonce}">
        window.reportData = ${JSON.stringify(reportData)};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private getErrorHtml(error: string): string {
        return `
            <div class="error-container">
                <h2>⚠️ Error Parsing JRXML</h2>
                <p>${error}</p>
            </div>
        `;
    }

    private getReportHtml(report: JrxmlReport): string {
        return `
            <div class="toolbar">
                <div class="toolbar-section">
                    <span class="toolbar-title">📄 ${report.name}</span>
                    <span class="toolbar-info">${report.pageWidth}×${report.pageHeight} ${report.orientation}</span>
                </div>
                <div class="toolbar-section">
                    <button id="zoomOut" class="toolbar-btn">−</button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomIn" class="toolbar-btn">+</button>
                    <button id="exportHtml" class="toolbar-btn">📄 Export HTML</button>
                    <button id="toggleProps" class="toolbar-btn">🔧 Properties</button>
                </div>
            </div>
            
            <div class="sidebar">
                <h3>Report Info</h3>
                <div class="info-group">
                    <div class="info-item"><strong>Name:</strong> ${report.name}</div>
                    <div class="info-item"><strong>Page:</strong> ${report.pageWidth}×${report.pageHeight}</div>
                    <div class="info-item"><strong>Orientation:</strong> ${report.orientation}</div>
                    <div class="info-item"><strong>Margins:</strong> L:${report.leftMargin} R:${report.rightMargin} T:${report.topMargin} B:${report.bottomMargin}</div>
                </div>
                
                ${report.parameters.length > 0 ? `
                <h3>Parameters (${report.parameters.length})</h3>
                <div class="info-group">
                    ${report.parameters.map((p: any) => `
                        <div class="info-item">
                            <strong>${p.name}</strong>
                            <div class="info-detail">${p.class}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${report.fields.length > 0 ? `
                <h3>Fields (${report.fields.length})</h3>
                <div class="info-group">
                    ${report.fields.map((f: any) => `
                        <div class="info-item">
                            <strong>${f.name}</strong>
                            <div class="info-detail">${f.class}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${report.variables.length > 0 ? `
                <h3>Variables (${report.variables.length})</h3>
                <div class="info-group">
                    ${report.variables.map((v: any) => `
                        <div class="info-item">
                            <strong>${v.name}</strong>
                            <div class="info-detail">${v.class} (${v.calculation})</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            <div class="preview-container">
                <div id="canvas" class="report-canvas" style="width: ${report.pageWidth}px; height: ${this.calculateTotalHeight(report)}px;">
                    ${this.renderBands(report)}
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
        `;
    }

    private calculateTotalHeight(report: JrxmlReport): number {
        let total = 0;
        report.bands.forEach((band: any) => total += band.height);
        return total;
    }

    private renderBands(report: JrxmlReport): string {
        let currentY = 0;
        return report.bands.map((band: any) => {
            const bandHtml = `
                <div class="band band-${band.type}" style="top: ${currentY}px; height: ${band.height}px; width: ${report.columnWidth}px; left: ${report.leftMargin}px;">
                    <div class="band-label">${band.type.toUpperCase()}</div>
                    ${this.renderElements(band.elements)}
                </div>
            `;
            currentY += band.height;
            return bandHtml;
        }).join('');
    }

    private renderElements(elements: any[]): string {
        return elements.map((element, index) => {
            const style = `left: ${element.x}px; top: ${element.y}px; width: ${element.width}px; height: ${element.height}px;`;
            const dataAttrs = `data-element='${JSON.stringify(element).replace(/'/g, '&apos;')}'`;
            
            switch (element.type) {
                case 'staticText':
                    return `<div class="element element-text clickable" style="${style}" ${dataAttrs} 
                        title="Static Text&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}&#10;Text: ${element.text || 'N/A'}">
                        <div class="element-content">${element.text || 'Static Text'}</div>
                    </div>`;
                    
                case 'textField':
                    return `<div class="element element-field clickable" style="${style}" ${dataAttrs}
                        title="Text Field&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}&#10;Expression: ${element.expression || 'N/A'}&#10;Pattern: ${element.pattern || 'N/A'}">
                        <div class="element-content">${element.expression || '$F{field}'}</div>
                    </div>`;
                    
                case 'image':
                    return `<div class="element element-image clickable" style="${style}" ${dataAttrs}
                        title="Image&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}">
                        <div class="element-content">🖼️ Image</div>
                    </div>`;
                    
                case 'line':
                    return `<div class="element element-line clickable" style="${style}" ${dataAttrs}
                        title="Line&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}"></div>`;
                    
                case 'rectangle':
                    return `<div class="element element-rectangle clickable" style="${style}" ${dataAttrs}
                        title="Rectangle&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}&#10;Background: ${element.backcolor || 'transparent'}"></div>`;
                    
                case 'subreport':
                    return `<div class="element element-subreport clickable" style="${style}" ${dataAttrs}
                        title="Subreport&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}&#10;Expression: ${element.expression || 'N/A'}">
                        <div class="element-content">📊 Subreport</div>
                    </div>`;
                    
                case 'chart':
                    return `<div class="element element-chart clickable" style="${style}" ${dataAttrs}
                        title="Chart&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}&#10;Type: ${element.expression || 'chart'}">
                        <div class="element-content">📈 ${element.expression || 'Chart'}</div>
                    </div>`;
                    
                default:
                    return `<div class="element clickable" style="${style}" ${dataAttrs}
                        title="${element.type}&#10;Position: (${element.x}, ${element.y})&#10;Size: ${element.width}×${element.height}">
                        <div class="element-content">${element.type}</div>
                    </div>`;
            }
        }).join('');
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private async exportToHtml(reportData: JrxmlReport | null, uri: vscode.Uri): Promise<void> {
        if (!reportData) {
            vscode.window.showErrorMessage('No report data to export');
            return;
        }

        const htmlContent = this.generateStandaloneHtml(reportData);
        const fileName = uri.fsPath.replace('.jrxml', '_export.html');
        const exportUri = vscode.Uri.file(fileName);

        try {
            await vscode.workspace.fs.writeFile(exportUri, Buffer.from(htmlContent, 'utf8'));
            vscode.window.showInformationMessage(`Report exported to: ${fileName}`);
            
            const openFile = await vscode.window.showInformationMessage(
                'Export successful!', 
                'Open File', 
                'Reveal in Explorer'
            );
            
            if (openFile === 'Open File') {
                await vscode.commands.executeCommand('vscode.open', exportUri);
            } else if (openFile === 'Reveal in Explorer') {
                await vscode.commands.executeCommand('revealFileInOS', exportUri);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export: ${error}`);
        }
    }

    private generateStandaloneHtml(report: JrxmlReport): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.name} - JRXML Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .report-container { background: white; padding: 20px; max-width: ${report.pageWidth}px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .report-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        h1 { margin: 0; color: #333; }
        .report-info { color: #666; font-size: 14px; margin-top: 5px; }
        .band { border: 1px solid #ddd; margin: 10px 0; padding: 10px; position: relative; }
        .band-label { background: #007acc; color: white; padding: 2px 8px; font-size: 11px; font-weight: bold; display: inline-block; margin-bottom: 5px; }
        .element { margin: 5px 0; padding: 5px; background: #f9f9f9; border-left: 3px solid #007acc; }
        .element-type { font-weight: bold; color: #007acc; font-size: 12px; }
        .element-content { color: #333; margin-top: 3px; }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>${report.name}</h1>
            <div class="report-info">
                ${report.pageWidth} × ${report.pageHeight} px | ${report.orientation} | 
                Parameters: ${report.parameters.length} | Fields: ${report.fields.length} | Variables: ${report.variables.length}
            </div>
        </div>
        ${report.bands.map((band: any) => `
            <div class="band">
                <span class="band-label">${band.type.toUpperCase()}</span>
                ${band.elements.map((elem: any) => `
                    <div class="element">
                        <div class="element-type">${elem.type}</div>
                        <div class="element-content">
                            ${elem.text || elem.expression || '(empty)'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    }
}
