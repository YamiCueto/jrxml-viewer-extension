import * as vscode from 'vscode';
import * as path from 'path';
import { parseJrxml, JrxmlReport } from './jrxmlParser';
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

export class JrxmlEditorProvider implements vscode.CustomReadonlyEditorProvider {
    private static readonly viewType = 'jrxml-viewer.editor';

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly elementsProvider: JrxmlElementsProvider,
        private readonly propertiesProvider: JrxmlPropertiesProvider
    ) {}

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
        let reportData: JrxmlReport | null = null;
        let layoutResult: LayoutResult | null = null;
        let renderedHtml = '';
        let parseError: string | null = null;

        try {
            currentDoc = parseJrxmlDocument(jrxmlText);
            layoutResult = layoutJrxmlDocument(currentDoc);
            renderedHtml = renderLayoutDocument(layoutResult);
            reportData = parseJrxml(jrxmlText);
        } catch (error) {
            parseError = error instanceof Error ? error.message : 'Unknown parsing error';
            outputChannel.appendLine(`[EditorProvider] Parsing error: ${parseError}`);
        }

        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            reportData,
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
                        this.exportToHtml(layoutResult, reportData, document.uri);
                        break;
                    case 'editElement':
                        vscode.window.showInformationMessage(`Editing: ${message.elementType} at (${message.x}, ${message.y})`);
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
                                reportData = parseJrxml(newXml);

                                webviewPanel.webview.html = this.getHtmlForWebview(
                                    webviewPanel.webview,
                                    reportData,
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
        reportData: JrxmlReport | null,
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
        ${parseError ? this.getErrorHtml(parseError) : this.getReportHtml(reportData!, layoutResult!, renderedHtml)}
    </div>
    <script nonce="${nonce}">
        window.reportData = ${JSON.stringify(reportData)};
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

    private getReportHtml(report: JrxmlReport, layout: LayoutResult, renderedHtml: string): string {
        return `
            <div class="toolbar">
                <div class="toolbar-section">
                    <span class="toolbar-title">📄 ${layout.reportName || report.name}</span>
                    <span class="toolbar-info">${layout.pageWidth}×${layout.pageHeight} (Content: ${layout.contentWidth}×${layout.contentHeight})</span>
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
                    <p>Click on an element to see its properties</p>
                </div>
            </div>
        `;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private async exportToHtml(layoutResult: LayoutResult | null, reportData: JrxmlReport | null, uri: vscode.Uri): Promise<void> {
        if (!layoutResult && !reportData) {
            vscode.window.showErrorMessage('No report data to export');
            return;
        }

        const htmlContent = layoutResult ? this.generateStandaloneHtmlFromLayout(layoutResult) : this.generateLegacyStandaloneHtml(reportData!);
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

    private generateStandaloneHtmlFromLayout(layout: LayoutResult): string {
        const renderedPages = renderLayoutDocument(layout);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${layout.reportName} - JRXML Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; margin: 0; padding: 40px; background: #424242; display: flex; flex-direction: column; align-items: center; }
        .band { position: absolute; overflow: visible; }
        .band-label { display: none; }
        .element { position: absolute; box-sizing: border-box; overflow: hidden; }
        .element-content { width: 100%; height: 100%; display: flex; align-items: center; }
        .element-text { color: #000; }
        .element-field { color: #000; }
    </style>
</head>
<body>
    ${renderedPages}
</body>
</html>`;
    }

    private generateLegacyStandaloneHtml(report: JrxmlReport): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.name} - JRXML Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .report-container { background: white; padding: 20px; max-width: ${report.pageWidth}px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="report-container">
        <h1>${report.name}</h1>
    </div>
</body>
</html>`;
    }
}
