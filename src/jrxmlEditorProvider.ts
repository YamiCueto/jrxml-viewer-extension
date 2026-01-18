import * as vscode from 'vscode';
import * as path from 'path';
import { parseJrxml, JrxmlReport } from './jrxmlParser';
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
        
        // Notify providers that a JRXML document has been opened
        const textDocument = await vscode.workspace.openTextDocument(document.uri);
        this.elementsProvider.setCurrentDocument(textDocument);
        this.propertiesProvider.setCurrentDocument(textDocument);
        
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
            if (reportData) {
                outputChannel.appendLine(`[EditorProvider] Initial parse: bands=${reportData.bands.length}`);
                reportData.bands.forEach((b: any, i: number) => {
                    outputChannel.appendLine(`[EditorProvider] Band[${i}] type=${b.type} elements=${(b.elements||[]).length}`);
                });
            }
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
            async message => {
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
                    case 'updateElement':
                        await this.updateElementInFile(document.uri, message.elementData, jrxmlText);
                        // Refresh the webview
                        const updatedContent = await vscode.workspace.fs.readFile(document.uri);
                        const updatedText = Buffer.from(updatedContent).toString('utf8');
                        try {
                            reportData = parseJrxml(updatedText);
                            if (reportData) {
                                outputChannel.appendLine(`[EditorProvider] Refresh parse: bands=${reportData.bands.length}`);
                                reportData.bands.forEach((b: any, i: number) => {
                                    outputChannel.appendLine(`[EditorProvider] AfterUpdate Band[${i}] type=${b.type} elements=${(b.elements||[]).length}`);
                                });
                            }
                            webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, reportData, null);
                            vscode.window.showInformationMessage('Element updated successfully!');
                        } catch (error) {
                            vscode.window.showErrorMessage('Error refreshing preview');
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
        return report.bands.map((band: any, bandIndex: number) => {
            const bandHtml = `
                <div class="band band-${band.type}" style="top: ${currentY}px; height: ${band.height}px; width: ${report.columnWidth}px; left: ${report.leftMargin}px;">
                    <div class="band-label">${band.type.toUpperCase()}</div>
                    ${this.renderElements(band.elements, band.type, bandIndex)}
                </div>
            `;
            currentY += band.height;
            return bandHtml;
        }).join('');
    }

    private renderElements(elements: any[], bandType: string, bandIndex: number): string {
        return elements.map((element, elementIndex) => {
            // Add identification data to element
            const elementWithId = {
                ...element,
                bandType,
                bandIndex,
                elementIndex,
                originalX: element.x,
                originalY: element.y
            };
            
            const style = `left: ${element.x}px; top: ${element.y}px; width: ${element.width}px; height: ${element.height}px;`;
            const dataAttrs = `data-element='${JSON.stringify(elementWithId).replace(/'/g, '&apos;')}' data-band="${bandType}" data-band-index="${bandIndex}" data-element-index="${elementIndex}"`;
            
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

    private async updateElementInFile(uri: vscode.Uri, elementData: any, originalContent: string): Promise<void> {
        try {
            const { bandType, bandIndex, elementIndex, originalX, originalY } = elementData;
            
            if (bandType === undefined || elementIndex === undefined) {
                vscode.window.showErrorMessage('Cannot identify element location in file');
                return;
            }

            // Read the current file content
            const content = await vscode.workspace.fs.readFile(uri);
            let xmlContent = Buffer.from(content).toString('utf8');
            const originalXmlContent = xmlContent; // Keep original for comparison

            const xmlElementType = elementData.type;
            const searchX = originalX !== undefined ? originalX : elementData.x;
            const searchY = originalY !== undefined ? originalY : elementData.y;

            outputChannel.appendLine(`[EditorProvider] Searching for ${xmlElementType} at original position (${searchX}, ${searchY})`);
            outputChannel.appendLine(`[EditorProvider] New values: x=${elementData.x}, y=${elementData.y}, width=${elementData.width}, height=${elementData.height}`);

            let updated = false;

            // Find reportElement with matching x and y coordinates and update its parent block
            const reportElementRegex = /<reportElement([\s\S]*?)\/?\s*>/g;
            let match;

            while ((match = reportElementRegex.exec(xmlContent)) !== null) {
                const fullMatch = match[0];
                const attributes = match[1] || '';

                const xMatch = attributes.match(/x="(\d+)"/);
                const yMatch = attributes.match(/y="(\d+)"/);

                if (xMatch && yMatch) {
                    const foundX = parseInt(xMatch[1]);
                    const foundY = parseInt(yMatch[1]);

                    outputChannel.appendLine(`[EditorProvider] Found reportElement with x=${foundX}, y=${foundY}`);

                    if (foundX === searchX && foundY === searchY) {
                        outputChannel.appendLine(`[EditorProvider] MATCH! Located reportElement at index ${match.index}`);

                        // Locate parent tag (e.g., <staticText> or <textField>) surrounding this reportElement
                        const parentTag = elementData.type; // 'staticText' or 'textField' etc.
                        const parentStart = xmlContent.lastIndexOf(`<${parentTag}`, match.index);
                        if (parentStart === -1) {
                            outputChannel.appendLine(`[EditorProvider] Could not find parent <${parentTag}> start`);
                            break;
                        }
                        const parentEndTag = `</${parentTag}>`;
                        const parentEnd = xmlContent.indexOf(parentEndTag, match.index);
                        if (parentEnd === -1) {
                            outputChannel.appendLine(`[EditorProvider] Could not find parent </${parentTag}> end`);
                            break;
                        }

                        const parentBlock = xmlContent.substring(parentStart, parentEnd + parentEndTag.length);

                        outputChannel.appendLine(`[EditorProvider] Parent block length: ${parentBlock.length}`);

                        // Replace attributes inside the reportElement within parentBlock
                        const updatedParentBlock = parentBlock.replace(/<reportElement([\s\S]*?)\/?\s*>/, (repMatch: string, repAttrs: string) => {
                            let newRepAttrs = repAttrs;
                            // Update x/y/width/height if present
                            if (/x="\d+"/.test(newRepAttrs)) {
                                newRepAttrs = newRepAttrs.replace(/x="\d+"/, `x="${elementData.x}"`);
                            } else {
                                newRepAttrs = `${newRepAttrs} x="${elementData.x}"`;
                            }
                            if (/y="\d+"/.test(newRepAttrs)) {
                                newRepAttrs = newRepAttrs.replace(/y="\d+"/, `y="${elementData.y}"`);
                            } else {
                                newRepAttrs = `${newRepAttrs} y="${elementData.y}"`;
                            }
                            if (/width="\d+"/.test(newRepAttrs)) {
                                newRepAttrs = newRepAttrs.replace(/width="\d+"/, `width="${elementData.width}"`);
                            } else {
                                newRepAttrs = `${newRepAttrs} width="${elementData.width}"`;
                            }
                            if (/height="\d+"/.test(newRepAttrs)) {
                                newRepAttrs = newRepAttrs.replace(/height="\d+"/, `height="${elementData.height}"`);
                            } else {
                                newRepAttrs = `${newRepAttrs} height="${elementData.height}"`;
                            }

                            return `<reportElement${newRepAttrs}>`;
                        });

                        // Update font properties inside textElement if present
                        let finalParentBlock = updatedParentBlock;
                        if ((elementData.fontSize !== undefined) || (elementData.isBold !== undefined)) {
                            finalParentBlock = finalParentBlock.replace(/<textElement([\s\S]*?)>([\s\S]*?)<\/textElement>/, (tm: string, tAttrs: string, inner: string) => {
                                // Update or add <font .../> tag
                                let newInner = inner;
                                if (/\<font[\s\S]*?\/>/.test(inner)) {
                                    newInner = inner.replace(/<font([\s\S]*?)\/>/, (fm: string, fAttrs: string) => {
                                        let newF = fAttrs;
                                        if (elementData.fontSize !== undefined) {
                                            if (/size="\d+"/.test(newF)) {
                                                newF = newF.replace(/size="\d+"/, `size="${elementData.fontSize}"`);
                                            } else {
                                                newF = `${newF} size="${elementData.fontSize}"`;
                                            }
                                        }
                                        if (elementData.isBold !== undefined) {
                                            if (/isBold="(true|false)"/.test(newF)) {
                                                newF = newF.replace(/isBold="(true|false)"/, `isBold="${elementData.isBold ? 'true' : 'false'}"`);
                                            } else {
                                                newF = `${newF} isBold="${elementData.isBold ? 'true' : 'false'}"`;
                                            }
                                        }
                                        return `<font${newF} />`;
                                    });
                                } else {
                                    // insert a font tag
                                    const fontTag = `<font${elementData.fontSize !== undefined ? ` size="${elementData.fontSize}"` : ''}${elementData.isBold !== undefined ? ` isBold="${elementData.isBold ? 'true' : 'false'}"` : ''}/>`;
                                    newInner = fontTag + newInner;
                                }
                                return `<textElement${tAttrs}>${newInner}</textElement>`;
                            });
                        }

                        // Update appearance attributes like backcolor and mode
                        if (elementData.backcolor !== undefined || elementData.mode !== undefined || elementData.forecolor !== undefined) {
                            // update backcolor and mode on reportElement or textElement as appropriate
                            finalParentBlock = finalParentBlock.replace(/<reportElement([\s\S]*?)\/?\s*>/, (repMatch: string) => {
                                let repAttrs = repMatch.replace(/^<reportElement/, '').replace(/\/>$/, '').replace(/>$/, '');
                                if (elementData.backcolor !== undefined) {
                                    if (/backcolor="[^"]*"/.test(repAttrs)) {
                                        repAttrs = repAttrs.replace(/backcolor="[^"]*"/, `backcolor="${elementData.backcolor}"`);
                                    } else {
                                        repAttrs = `${repAttrs} backcolor="${elementData.backcolor}"`;
                                    }
                                }
                                if (elementData.mode !== undefined) {
                                    if (/mode="[^"]*"/.test(repAttrs)) {
                                        repAttrs = repAttrs.replace(/mode="[^"]*"/, `mode="${elementData.mode}"`);
                                    } else {
                                        repAttrs = `${repAttrs} mode="${elementData.mode}"`;
                                    }
                                }
                                if (elementData.forecolor !== undefined) {
                                    if (/forecolor="[^"]*"/.test(repAttrs)) {
                                        repAttrs = repAttrs.replace(/forecolor="[^"]*"/, `forecolor="${elementData.forecolor}"`);
                                    } else {
                                        repAttrs = `${repAttrs} forecolor="${elementData.forecolor}"`;
                                    }
                                }
                                return `<reportElement${repAttrs}>`;
                            });
                        }

                        // Replace parent block in xmlContent
                        xmlContent = xmlContent.substring(0, parentStart) + finalParentBlock + xmlContent.substring(parentEnd + parentEndTag.length);

                        outputChannel.appendLine(`[EditorProvider] Parent block updated`);

                        updated = true;
                        break;
                    }
                }
            }

            // Update text content for staticText
            if (updated && elementData.type === 'staticText' && elementData.text !== undefined) {
                const staticTextRegex = new RegExp(
                    `(<staticText[\\s\\S]*?<reportElement[^>]*x="${elementData.x}"[^>]*y="${elementData.y}"[^>]*[\\s\\S]*?<text>)((?:<\\!\\[CDATA\\[)?[\\s\\S]*?(?:\\]\\]>)?)(</text>)`,
                    'g'
                );
                
                xmlContent = xmlContent.replace(staticTextRegex, (match, before, oldText, after) => {
                    outputChannel.appendLine(`[EditorProvider] Updating staticText content to: ${elementData.text}`);
                    return `${before}<![CDATA[${elementData.text}]]>${after}`;
                });
            }

            // Update expression for textField
            if (updated && elementData.type === 'textField' && elementData.expression !== undefined) {
                const textFieldRegex = new RegExp(
                    `(<textField[\\s\\S]*?<reportElement[^>]*x="${elementData.x}"[^>]*y="${elementData.y}"[^>]*[\\s\\S]*?<textFieldExpression>)((?:<\\!\\[CDATA\\[)?[\\s\\S]*?(?:\\]\\]>)?)(</textFieldExpression>)`,
                    'g'
                );
                
                xmlContent = xmlContent.replace(textFieldRegex, (match, before, oldExpr, after) => {
                    outputChannel.appendLine(`[EditorProvider] Updating textField expression to: ${elementData.expression}`);
                    return `${before}<![CDATA[${elementData.expression}]]>${after}`;
                });
            }

            if (!updated) {
                outputChannel.appendLine(`[EditorProvider] WARNING: No element found at (${searchX}, ${searchY})`);
                vscode.window.showWarningMessage(`Could not find element in file. Changes may not have been saved.`);
                return;
            }

            // Check if content actually changed
            if (xmlContent === originalXmlContent) {
                outputChannel.appendLine(`[EditorProvider] WARNING: Content did not change!`);
                vscode.window.showWarningMessage(`No changes detected in file content.`);
                return;
            }

            outputChannel.appendLine(`[EditorProvider] Content changed, writing to file...`);
            outputChannel.appendLine(`[EditorProvider] File URI: ${uri.toString()}`);

            // Write the updated content back to the file
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(xmlContent);
            await vscode.workspace.fs.writeFile(uri, uint8Array);
            
            outputChannel.appendLine(`[EditorProvider] File written successfully! (${uint8Array.length} bytes)`);
            // Read back and log diagnostics to ensure content as expected
            try {
                const verifyBuf = await vscode.workspace.fs.readFile(uri);
                const verifyText = Buffer.from(verifyBuf).toString('utf8');
                const bandCount = (verifyText.match(/<band[\s>]/g) || []).length;
                const textFieldCount = (verifyText.match(/<textField[\s>]/g) || []).length;
                const staticTextCount = (verifyText.match(/<staticText[\s>]/g) || []).length;
                outputChannel.appendLine(`[EditorProvider] Verify read - bands:${bandCount} textField:${textFieldCount} staticText:${staticTextCount}`);
                const snippet = verifyText.substring(0, 2000).replace(/\n/g, '\\n');
                outputChannel.appendLine(`[EditorProvider] File snippet (first 2000 chars): ${snippet}`);
                // Try parsing and report number of bands parsed
                try {
                    const parsed = parseJrxml(verifyText);
                    outputChannel.appendLine(`[EditorProvider] parseJrxml returned ${parsed.bands.length} bands`);
                } catch (pErr) {
                    outputChannel.appendLine(`[EditorProvider] parseJrxml error after write: ${pErr}`);
                }
            } catch (readErr) {
                outputChannel.appendLine(`[EditorProvider] Error reading file after write: ${readErr}`);
            }
        } catch (error) {
            outputChannel.appendLine(`[EditorProvider] Error updating element: ${error}`);
            vscode.window.showErrorMessage(`Failed to update element: ${error}`);
        }
    }
}
