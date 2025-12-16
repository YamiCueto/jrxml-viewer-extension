import * as vscode from 'vscode';
import { XMLParser } from 'fast-xml-parser';
import { outputChannel } from './extension';

export class JrxmlElementsProvider implements vscode.TreeDataProvider<ElementItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ElementItem | undefined | null | void> = new vscode.EventEmitter<ElementItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ElementItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;

    constructor() {
        outputChannel.appendLine('[ElementsProvider] Initializing...');
        
        // Initialize with active editor if it's a JRXML file
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith('.jrxml')) {
            outputChannel.appendLine(`[ElementsProvider] Found active JRXML file: ${activeEditor.document.fileName}`);
            this.currentDocument = activeEditor.document;
        }
        
        // Listen to active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.fileName.endsWith('.jrxml')) {
                outputChannel.appendLine(`[ElementsProvider] Active editor changed: ${editor.document.fileName}`);
                this.currentDocument = editor.document;
                this.refresh();
            }
        });

        // Listen to document open events
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.fileName.endsWith('.jrxml') && vscode.window.activeTextEditor?.document === document) {
                outputChannel.appendLine(`[ElementsProvider] Document opened: ${document.fileName}`);
                this.currentDocument = document;
                this.refresh();
            }
        });

        // Listen to document changes
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === this.currentDocument) {
                this.refresh();
            }
        });
    }

    refresh(): void {
        outputChannel.appendLine('[ElementsProvider] Refreshing tree view...');
        this._onDidChangeTreeData.fire();
    }

    setCurrentDocument(document: vscode.TextDocument): void {
        outputChannel.appendLine(`[ElementsProvider] Document set via custom editor: ${document.fileName}`);
        this.currentDocument = document;
        this.refresh();
    }

    getTreeItem(element: ElementItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ElementItem): ElementItem[] {
        outputChannel.appendLine(`[ElementsProvider] getChildren called, element: ${element?.label || 'root'}`);
        
        // Don't process info or error messages as expandable nodes
        if (element && (element.elementType === 'info' || element.elementType === 'error')) {
            outputChannel.appendLine('[ElementsProvider] Info/Error element, returning empty array');
            return [];
        }
        
        // If element is provided, return its children (never create new elements here)
        if (element) {
            outputChannel.appendLine(`[ElementsProvider] Returning children for: ${element.label}`);
            return element.children || [];
        }
        
        // Only check for document when element is undefined (root level)
        if (!this.currentDocument || !this.currentDocument.fileName.endsWith('.jrxml')) {
            outputChannel.appendLine('[ElementsProvider] No JRXML file open');
            return [new ElementItem('No JRXML file open', 'info', {})];
        }

        try {
            outputChannel.appendLine('[ElementsProvider] Parsing XML content...');
            const xmlContent = this.currentDocument.getText();
            
            // Check if content is valid
            if (!xmlContent || xmlContent.trim().length === 0) {
                outputChannel.appendLine('[ElementsProvider] Empty JRXML file');
                return [new ElementItem('Empty JRXML file', 'info', {})];
            }
            
            outputChannel.appendLine(`[ElementsProvider] XML content length: ${xmlContent.length} bytes`);
            
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_',
                textNodeName: '#text',
                parseAttributeValue: true,
                trimValues: true
            });
            
            const parsed = parser.parse(xmlContent);
            outputChannel.appendLine('[ElementsProvider] XML parsed successfully');
            
            if (!parsed) {
                outputChannel.appendLine('[ElementsProvider] Failed to parse XML');
                return [new ElementItem('Failed to parse XML', 'error', {})];
            }

            const items: ElementItem[] = [];

            if (!parsed.jasperReport) {
                outputChannel.appendLine('[ElementsProvider] No jasperReport found in XML');
                return [new ElementItem('No jasperReport found', 'info', {})];
            }

            outputChannel.appendLine('[ElementsProvider] Found jasperReport, processing bands...');
            const report = parsed.jasperReport;
            
            // Process each band
            const bandTypes = [
                { key: 'title', label: 'Title Band' },
                { key: 'pageHeader', label: 'Page Header' },
                { key: 'columnHeader', label: 'Column Header' },
                { key: 'detail', label: 'Detail Band' },
                { key: 'columnFooter', label: 'Column Footer' },
                { key: 'pageFooter', label: 'Page Footer' },
                { key: 'summary', label: 'Summary Band' }
            ];

            for (const band of bandTypes) {
                try {
                    if (report[band.key]) {
                        outputChannel.appendLine(`[ElementsProvider] Processing band: ${band.label}`);
                        const bandData = report[band.key];
                        const bandItem = new ElementItem(
                            band.label,
                            'band',
                            { height: bandData['@_height'] || '0' }
                        );
                        
                        // Extract elements from band
                        bandItem.children = this.extractElementsFromBand(bandData);
                        outputChannel.appendLine(`[ElementsProvider] Found ${bandItem.children.length} elements in ${band.label}`);
                        
                        if (bandItem.children.length > 0) {
                            items.push(bandItem);
                        }
                    }
                } catch (bandError) {
                    outputChannel.appendLine(`[ElementsProvider] Error processing ${band.key}: ${bandError}`);
                    console.error(`Error processing ${band.key}:`, bandError);
                }
            }

            if (items.length === 0) {
                outputChannel.appendLine('[ElementsProvider] No elements found in any band');
                return [new ElementItem('No elements found', 'info', {})];
            }

            outputChannel.appendLine(`[ElementsProvider] Total bands with elements: ${items.length}`);
            return items;
        } catch (error) {
            outputChannel.appendLine(`[ElementsProvider] Error in getChildren: ${error}`);
            console.error('Error in getChildren:', error);
            return [new ElementItem('Error parsing JRXML', 'error', { message: (error as Error).message })];
        }
    }

    private extractElementsFromBand(band: any): ElementItem[] {
        const elements: ElementItem[] = [];
        
        if (!band) {
            return elements;
        }
        
        const elementTypes = [
            { key: 'staticText', label: 'Static Text', icon: 'symbol-string' },
            { key: 'textField', label: 'Text Field', icon: 'symbol-field' },
            { key: 'image', label: 'Image', icon: 'file-media' },
            { key: 'rectangle', label: 'Rectangle', icon: 'symbol-namespace' },
            { key: 'ellipse', label: 'Ellipse', icon: 'circle-outline' },
            { key: 'line', label: 'Line', icon: 'remove' },
            { key: 'chart', label: 'Chart', icon: 'graph' },
            { key: 'subreport', label: 'Subreport', icon: 'file-submodule' }
        ];

        for (const elemType of elementTypes) {
            try {
                if (band[elemType.key]) {
                    const elemArray = Array.isArray(band[elemType.key]) ? band[elemType.key] : [band[elemType.key]];
                    
                    elemArray.forEach((elem: any, index: number) => {
                        try {
                            const reportElement = elem.reportElement || {};
                            const position = {
                                x: reportElement['@_x'] || '0',
                                y: reportElement['@_y'] || '0',
                                width: reportElement['@_width'] || '0',
                                height: reportElement['@_height'] || '0'
                            };

                            let label = elemType.label;
                            let description = `(${position.x}, ${position.y})`;
                            
                            // Add specific info based on element type
                            if (elemType.key === 'staticText' && elem.text) {
                                const text = typeof elem.text === 'string' ? elem.text : (elem.text['#text'] || '');
                                label = text.substring(0, 30) + (text.length > 30 ? '...' : '');
                                description = `Static Text at (${position.x}, ${position.y})`;
                            } else if (elemType.key === 'textField' && elem.textFieldExpression) {
                                const expr = typeof elem.textFieldExpression === 'string' 
                                    ? elem.textFieldExpression 
                                    : (elem.textFieldExpression['#text'] || '');
                                label = expr.substring(0, 30) + (expr.length > 30 ? '...' : '');
                                description = `Expression at (${position.x}, ${position.y})`;
                            } else if (elemType.key === 'chart') {
                                const chartType = elem['@_chartType'] || 'unknown';
                                label = `${chartType} Chart`;
                            } else if (elemType.key === 'subreport') {
                                const subreportExpr = elem.subreportExpression;
                                if (subreportExpr) {
                                    const expr = typeof subreportExpr === 'string' ? subreportExpr : (subreportExpr['#text'] || '');
                                    label = `Subreport: ${expr.substring(0, 20)}`;
                                }
                            } else if (elemArray.length > 1) {
                                label = `${elemType.label} #${index + 1}`;
                            }

                            const item = new ElementItem(label, elemType.key, {
                                ...position,
                                icon: elemType.icon
                            });
                            
                            item.description = description;
                            elements.push(item);
                        } catch (elemError) {
                            console.error(`Error processing element ${index}:`, elemError);
                        }
                    });
                }
            } catch (typeError) {
                console.error(`Error processing element type ${elemType.key}:`, typeError);
            }
        }

        return elements;
    }
}

export class ElementItem extends vscode.TreeItem {
    public children?: ElementItem[];

    constructor(
        public readonly label: string,
        public readonly elementType: string,
        public readonly properties: any
    ) {
        super(
            label,
            elementType === 'band' || elementType === 'info' 
                ? vscode.TreeItemCollapsibleState.Expanded 
                : vscode.TreeItemCollapsibleState.None
        );

        this.contextValue = elementType;
        this.iconPath = this.getIcon();
        
        if (elementType === 'band') {
            this.description = `height: ${properties.height}px`;
        }

        if (elementType !== 'band' && elementType !== 'info' && elementType !== 'error') {
            this.tooltip = new vscode.MarkdownString(
                `**Position:** (${properties.x}, ${properties.y})\n\n` +
                `**Size:** ${properties.width} × ${properties.height}px`
            );
        }
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.properties.icon) {
            return new vscode.ThemeIcon(this.properties.icon);
        }

        switch (this.elementType) {
            case 'band': return new vscode.ThemeIcon('symbol-namespace');
            case 'staticText': return new vscode.ThemeIcon('symbol-string');
            case 'textField': return new vscode.ThemeIcon('symbol-field');
            case 'image': return new vscode.ThemeIcon('file-media');
            case 'rectangle': return new vscode.ThemeIcon('symbol-namespace');
            case 'ellipse': return new vscode.ThemeIcon('circle-outline');
            case 'line': return new vscode.ThemeIcon('remove');
            case 'chart': return new vscode.ThemeIcon('graph');
            case 'subreport': return new vscode.ThemeIcon('file-submodule');
            case 'error': return new vscode.ThemeIcon('error');
            default: return new vscode.ThemeIcon('symbol-misc');
        }
    }
}
