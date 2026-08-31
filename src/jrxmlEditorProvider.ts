import * as vscode from 'vscode';
import * as path from 'path';
import { parseJrxmlDocument } from './model/jrxmlDocumentParser';
import { JrxmlDocument } from './model/jrxmlDocumentModel';
import { layoutJrxmlDocument } from './layout/jrxmlLayoutEngine';
import { LayoutResult } from './layout/jrxmlLayoutModel';
import { renderLayoutDocument } from './render/jrxmlRenderer';
import { mutateElement } from './editing/jrxmlDocumentMutator';
import { serializeJrxmlDocument } from './editing/jrxmlSerializer';
import { JrxmlElementPatch } from './editing/jrxmlEditingModel';
import { JrxmlElementsProvider } from './jrxmlElementsProvider';
import { JrxmlPropertiesProvider } from './jrxmlPropertiesProvider';
import { outputChannel } from './extension';
import { generateStandaloneHtml } from './export/jrxmlHtmlExporter';

export class JrxmlEditorProvider implements vscode.CustomReadonlyEditorProvider {
    private static readonly viewType = 'jrxml-viewer.editor';

    private activePanels = new Set<vscode.WebviewPanel>();
    private activePanel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly elementsProvider: JrxmlElementsProvider,
        private readonly propertiesProvider: JrxmlPropertiesProvider
    ) {}

    public postMessageToActiveEditor(message: any): void {
        if (this.activePanel) {
            this.activePanel.webview.postMessage(message);
        } else {
            for (const panel of this.activePanels) {
                panel.webview.postMessage(message);
            }
        }
    }

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
        outputChannel.appendLine(`[EditorProvider] Opening custom editor for: ${document.uri.fsPath}`);

        this.activePanels.add(webviewPanel);
        this.activePanel = webviewPanel;

        webviewPanel.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                this.activePanel = e.webviewPanel;
            }
        });

        webviewPanel.onDidDispose(() => {
            this.activePanels.delete(webviewPanel);
            if (this.activePanel === webviewPanel) {
                this.activePanel = this.activePanels.values().next().value;
            }
        });

        const textDocument = await vscode.workspace.openTextDocument(document.uri);
        this.elementsProvider.setCurrentDocument(textDocument);
        this.propertiesProvider.setCurrentDocument(textDocument);

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        const jrxmlContent = await vscode.workspace.fs.readFile(document.uri);
        const jrxmlText = Buffer.from(jrxmlContent).toString('utf8');

        let currentDoc: JrxmlDocument | null = null;
        let layoutResult: LayoutResult | null = null;
        let renderedHtml = '';
        let parseError: string | null = null;

        try {
            currentDoc = parseJrxmlDocument(jrxmlText);
            layoutResult = layoutJrxmlDocument(currentDoc);
            renderedHtml = renderLayoutDocument(layoutResult);
        } catch (error) {
            parseError = error instanceof Error ? error.message : 'Unknown parsing error';
            outputChannel.appendLine(`[EditorProvider] Parsing error: ${parseError}`);
        }

        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            currentDoc,
            layoutResult,
            renderedHtml,
            parseError
        );

        webviewPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    case 'exportHtml':
                        this.exportToHtml(layoutResult, currentDoc, document.uri);
                        break;
                    case 'editElement':
                        vscode.window.showInformationMessage(`Editing: ${message.elementType} at (${message.x}, ${message.y})`);
                        break;
                    case 'elementSelected':
                        if (message.elementData) {
                            this.propertiesProvider.setSelectedElement(message.elementData);
                        }
                        break;
                    case 'updateElement':
                        if (!currentDoc) {
                            vscode.window.showErrorMessage('No active document model to update');
                            return;
                        }

                        const elementData = message.elementData || {};
                        const elementId = message.elementId || elementData.id;

                        if (!elementId) {
                            vscode.window.showErrorMessage('Element identity missing for update');
                            return;
                        }

                        const patch: JrxmlElementPatch = {
                            x: elementData.x !== undefined ? parseInt(elementData.x, 10) : undefined,
                            y: elementData.y !== undefined ? parseInt(elementData.y, 10) : undefined,
                            width: elementData.width !== undefined ? parseInt(elementData.width, 10) : undefined,
                            height: elementData.height !== undefined ? parseInt(elementData.height, 10) : undefined,
                            text: elementData.text,
                            expression: elementData.expression,
                            pattern: elementData.pattern,
                            fontName: elementData.fontName,
                            fontSize: elementData.fontSize !== undefined ? parseInt(elementData.fontSize, 10) : undefined,
                            isBold: elementData.isBold,
                            isItalic: elementData.isItalic,
                            isUnderline: elementData.isUnderline,
                            isStrikeThrough: elementData.isStrikeThrough,
                            forecolor: elementData.forecolor,
                            backcolor: elementData.backcolor,
                            mode: elementData.mode,
                            horizontalAlignment: elementData.textAlignment || elementData.horizontalAlignment,
                            verticalAlignment: elementData.verticalAlignment,
                            rotation: elementData.rotation,
                            radius: elementData.radius !== undefined ? parseInt(elementData.radius, 10) : undefined
                        };

                        const mutResult = mutateElement(currentDoc, elementId, patch);
                        if (!mutResult.success) {
                            vscode.window.showErrorMessage(`Update failed: ${mutResult.error}`);
                            return;
                        }

                        try {
                            const newXml = serializeJrxmlDocument(currentDoc);
                            const testParsed = parseJrxmlDocument(newXml);
                            if (testParsed && testParsed.report) {
                                await vscode.workspace.fs.writeFile(document.uri, Buffer.from(newXml, 'utf8'));

                                layoutResult = layoutJrxmlDocument(currentDoc);
                                renderedHtml = renderLayoutDocument(layoutResult);

                                webviewPanel.webview.html = this.getHtmlForWebview(
                                    webviewPanel.webview,
                                    currentDoc,
                                    layoutResult,
                                    renderedHtml,
                                    null
                                );
                                vscode.window.showInformationMessage('Element updated and saved successfully!');
                            } else {
                                vscode.window.showErrorMessage('Serialization validation failed: generated XML could not be verified.');
                            }
                        } catch (saveErr) {
                            vscode.window.showErrorMessage(`Atomic save failed: ${saveErr}`);
                        }
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private getHtmlForWebview(
        webview: vscode.Webview,
        doc: JrxmlDocument | null,
        layoutResult: LayoutResult | null,
        renderedHtml: string,
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
        ${parseError ? this.getErrorHtml(parseError) : this.getReportHtml(doc!, layoutResult!, renderedHtml)}
    </div>
    <script nonce="${nonce}">
        window.layoutResult = ${JSON.stringify(layoutResult)};
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

    private getReportHtml(doc: JrxmlDocument, layout: LayoutResult, renderedHtml: string): string {
        const report = doc.report;
        return `
            <div class="toolbar">
                <div class="toolbar-section">
                    <span class="toolbar-title">📄 ${layout.reportName || report.name}</span>
                    <span class="toolbar-info">${layout.pageWidth}×${layout.pageHeight} (Content: ${layout.contentWidth}×${layout.contentHeight})</span>
                </div>
                <div class="toolbar-section">
                    <button id="zoomOut" class="toolbar-btn" title="Zoom Out (Ctrl+Minus)">−</button>
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
                    <button id="zoomIn" class="toolbar-btn" title="Zoom In (Ctrl+Plus)">+</button>
                    <button id="exportHtml" class="toolbar-btn">📄 Export HTML</button>
                    <button id="toggleProps" class="toolbar-btn">🔧 Properties</button>
                </div>
            </div>
            
            <div class="sidebar">
                <h3>Report Info</h3>
                <div class="info-group">
                    <div class="info-item"><strong>Name:</strong> ${layout.reportName || report.name}</div>
                    <div class="info-item"><strong>Page:</strong> ${layout.pageWidth}×${layout.pageHeight}</div>
                    <div class="info-item"><strong>Content:</strong> ${layout.contentWidth}×${layout.contentHeight}</div>
                    <div class="info-item"><strong>Margins:</strong> L:${layout.margins.left} R:${layout.margins.right} T:${layout.margins.top} B:${layout.margins.bottom}</div>
                    <div class="info-item"><strong>Pages:</strong> ${layout.totalPages}</div>
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
                <div id="canvas" class="report-canvas-wrapper" style="transform-origin: top center; transition: transform 0.2s ease;">
                    ${renderedHtml}
                </div>
            </div>
            
            <div id="propertiesPanel" class="properties-panel">
                <div class="properties-header">
                    <h3>Properties</h3>
                    <button id="closeProps" class="close-btn">✕</button>
                </div>
                <div id="propertiesContent" class="properties-content">
                    <div class="no-selection">Select an element to edit its properties</div>
                </div>
            </div>
        `;
    }

    private async exportToHtml(layout: LayoutResult | null, doc: JrxmlDocument | null, sourceUri: vscode.Uri): Promise<void> {
        if (!layout || !doc) {
            vscode.window.showErrorMessage('No report layout available to export');
            return;
        }

        try {
            const htmlContent = generateStandaloneHtml(layout, doc);
            const defaultExportUri = vscode.Uri.file(sourceUri.fsPath.replace(/\.jrxml$/i, '_export.html'));

            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: defaultExportUri,
                filters: {
                    'HTML Files': ['html', 'htm']
                },
                saveLabel: 'Export Report HTML'
            });

            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(htmlContent, 'utf8'));
                vscode.window.showInformationMessage(`Report exported successfully to: ${path.basename(saveUri.fsPath)}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
