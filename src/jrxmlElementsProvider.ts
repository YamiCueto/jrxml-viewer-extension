import * as vscode from 'vscode';
import { parseJrxmlDocument } from './model/jrxmlDocumentParser';
import { JrxmlElement, JrxmlBand } from './model/jrxmlDocumentModel';
import { outputChannel } from './extension';

export class JrxmlElementsProvider implements vscode.TreeDataProvider<ElementItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ElementItem | undefined | null | void> = new vscode.EventEmitter<ElementItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ElementItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;

    constructor() {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.endsWith('.jrxml')) {
            this.currentDocument = activeEditor.document;
        }

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.fileName.endsWith('.jrxml')) {
                this.currentDocument = editor.document;
                this.refresh();
            }
        });

        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.fileName.endsWith('.jrxml') && vscode.window.activeTextEditor?.document === document) {
                this.currentDocument = document;
                this.refresh();
            }
        });

        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === this.currentDocument) {
                this.refresh();
            }
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setCurrentDocument(document: vscode.TextDocument): void {
        this.currentDocument = document;
        this.refresh();
    }

    getTreeItem(element: ElementItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ElementItem): ElementItem[] {
        if (element && (element.elementType === 'info' || element.elementType === 'error')) {
            return [];
        }

        if (element) {
            return element.children || [];
        }

        if (!this.currentDocument || !this.currentDocument.fileName.endsWith('.jrxml')) {
            return [new ElementItem('No JRXML file open', 'info', {})];
        }

        try {
            const xmlContent = this.currentDocument.getText();
            if (!xmlContent || xmlContent.trim().length === 0) {
                return [new ElementItem('Empty JRXML file', 'info', {})];
            }

            const doc = parseJrxmlDocument(xmlContent);
            const report = doc.report;
            const items: ElementItem[] = [];

            for (const band of report.bands) {
                const bandLabel = band.name ? `${band.type} (${band.name})` : `${band.type.toUpperCase()} Band`;
                const bandItem = new ElementItem(
                    bandLabel,
                    'band',
                    { height: band.height, bandType: band.type }
                );

                bandItem.children = this.convertElementsToItems(band.elements);
                if (bandItem.children.length > 0) {
                    items.push(bandItem);
                }
            }

            if (items.length === 0) {
                return [new ElementItem('No elements found', 'info', {})];
            }

            return items;
        } catch (error) {
            outputChannel.appendLine(`[ElementsProvider] Error in getChildren: ${error}`);
            return [new ElementItem('Error parsing JRXML', 'error', { message: (error as Error).message })];
        }
    }

    private convertElementsToItems(elements: JrxmlElement[]): ElementItem[] {
        const items: ElementItem[] = [];

        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const pos = el.geometry;
            let label = el.type;
            let description = `(${pos.x}, ${pos.y}) [${pos.width}x${pos.height}]`;

            if (el.type === 'staticText' && el.text) {
                label = el.text.length > 25 ? `${el.text.substring(0, 25)}...` : el.text;
                description = `StaticText (${pos.x}, ${pos.y})`;
            } else if (el.type === 'textField' && el.expression) {
                const raw = el.expression.raw;
                label = raw.length > 25 ? `${raw.substring(0, 25)}...` : raw;
                description = `TextField (${pos.x}, ${pos.y})`;
            } else if (el.type === 'chart') {
                label = `${el.chartType || 'Chart'}`;
                description = el.chartTitle ? `Chart: "${el.chartTitle}"` : `Chart (${pos.x}, ${pos.y})`;
            } else if (el.type === 'subreport') {
                const expr = el.subreportExpression?.raw || 'Subreport';
                label = `Subreport: ${expr.length > 20 ? expr.substring(0, 20) + '...' : expr}`;
            } else if (el.type === 'componentElement' && el.barcodeComponent) {
                const bc = el.barcodeComponent;
                const expr = bc.codeExpression?.raw || 'Barcode';
                label = `${bc.barcodeType}: ${expr.length > 18 ? expr.substring(0, 18) + '...' : expr}`;
                description = `Barcode (${pos.x}, ${pos.y})`;
            } else if (el.type === 'frame') {
                label = `Frame (${el.children?.length || 0} items)`;
            }

            const item = new ElementItem(label, el.type, {
                id: el.id,
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height
            });
            item.description = description;

            item.command = {
                command: 'jrxmlElements.revealElement',
                title: 'Reveal Element in Preview',
                arguments: [{
                    id: el.id,
                    label: label,
                    type: el.type,
                    x: pos.x,
                    y: pos.y,
                    width: pos.width,
                    height: pos.height
                }]
            };

            if (el.children && el.children.length > 0) {
                item.children = this.convertElementsToItems(el.children);
            }

            items.push(item);
        }

        return items;
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
            elementType === 'band' || elementType === 'frame' || elementType === 'info'
                ? vscode.TreeItemCollapsibleState.Expanded
                : (properties && properties.children && properties.children.length > 0
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None)
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
            case 'componentElement': return new vscode.ThemeIcon('symbol-constant');
            case 'frame': return new vscode.ThemeIcon('symbol-structure');
            case 'error': return new vscode.ThemeIcon('error');
            default: return new vscode.ThemeIcon('symbol-misc');
        }
    }
}
