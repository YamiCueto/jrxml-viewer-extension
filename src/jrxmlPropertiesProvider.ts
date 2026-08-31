import * as vscode from 'vscode';
import { parseJrxmlDocument } from './model/jrxmlDocumentParser';
import { JrxmlElement } from './model/jrxmlDocumentModel';

export class JrxmlPropertiesProvider implements vscode.TreeDataProvider<PropertyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PropertyItem | undefined | null | void> = new vscode.EventEmitter<PropertyItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PropertyItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;
    private selectedElementData: any = null;

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.fileName.endsWith('.jrxml')) {
                this.currentDocument = editor.document;
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
        this.selectedElementData = null;
        this.refresh();
    }

    setSelectedElement(data: any): void {
        this.selectedElementData = data;
        this.refresh();
    }

    getTreeItem(element: PropertyItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: PropertyItem): Promise<PropertyItem[]> {
        if (!this.currentDocument || !this.currentDocument.fileName.endsWith('.jrxml')) {
            return [new PropertyItem('No JRXML file open', '', 'info')];
        }

        if (element) {
            return element.children || [];
        }

        try {
            const xmlContent = this.currentDocument.getText();
            const doc = parseJrxmlDocument(xmlContent);
            const report = doc.report;

            const items: PropertyItem[] = [];

            if (this.selectedElementData) {
                const sel = this.selectedElementData;
                const selCategory = new PropertyItem('Selected Element', `${sel.type || 'Element'}`, 'category');
                const selChildren: PropertyItem[] = [
                    new PropertyItem('Type', sel.type || '', 'property'),
                    new PropertyItem('Position', `(${sel.x}, ${sel.y})`, 'property'),
                    new PropertyItem('Dimensions', `${sel.width} × ${sel.height}px`, 'property')
                ];
                if (sel.text !== undefined) {
                    selChildren.push(new PropertyItem('Text', String(sel.text), 'property'));
                }
                if (sel.expression !== undefined) {
                    selChildren.push(new PropertyItem('Expression', String(sel.expression), 'property'));
                }
                if (sel.displayValue !== undefined) {
                    selChildren.push(new PropertyItem('Display Value', String(sel.displayValue), 'property'));
                }
                if (sel.fontName) {
                    selChildren.push(new PropertyItem('Font Name', sel.fontName, 'property'));
                }
                if (sel.fontSize !== undefined) {
                    selChildren.push(new PropertyItem('Font Size', `${sel.fontSize}px`, 'property'));
                }
                if (sel.isBold !== undefined) {
                    selChildren.push(new PropertyItem('Bold', sel.isBold ? 'true' : 'false', 'property'));
                }
                if (sel.forecolor) {
                    selChildren.push(new PropertyItem('Forecolor', sel.forecolor, 'property'));
                }
                if (sel.backcolor) {
                    selChildren.push(new PropertyItem('Backcolor', sel.backcolor, 'property'));
                }
                selCategory.children = selChildren;
                items.push(selCategory);
            }

            const basicInfo = new PropertyItem('Document Info', '', 'category');
            basicInfo.children = [
                new PropertyItem('Name', report.name, 'property'),
                new PropertyItem('Page Width', `${report.pageWidth}px`, 'property'),
                new PropertyItem('Page Height', `${report.pageHeight}px`, 'property'),
                new PropertyItem('Orientation', report.orientation, 'property')
            ];
            items.push(basicInfo);

            const margins = new PropertyItem('Margins', '', 'category');
            margins.children = [
                new PropertyItem('Top', `${report.topMargin}px`, 'property'),
                new PropertyItem('Bottom', `${report.bottomMargin}px`, 'property'),
                new PropertyItem('Left', `${report.leftMargin}px`, 'property'),
                new PropertyItem('Right', `${report.rightMargin}px`, 'property')
            ];
            items.push(margins);

            if (report.bands.length > 0) {
                const bandsItem = new PropertyItem('Bands', `${report.bands.length} bands`, 'category');
                bandsItem.children = report.bands.map(band =>
                    new PropertyItem(band.type, `height: ${band.height}px`, 'band')
                );
                items.push(bandsItem);
            }

            if (report.parameters.length > 0) {
                const paramsItem = new PropertyItem('Parameters', `${report.parameters.length} parameters`, 'category');
                paramsItem.children = report.parameters.map(param =>
                    new PropertyItem(param.name, param.class, 'parameter')
                );
                items.push(paramsItem);
            }

            if (report.variables.length > 0) {
                const varsItem = new PropertyItem('Variables', `${report.variables.length} variables`, 'category');
                varsItem.children = report.variables.map(v =>
                    new PropertyItem(v.name, `${v.class} (${v.calculation})`, 'variable')
                );
                items.push(varsItem);
            }

            if (report.styles.length > 0) {
                const stylesItem = new PropertyItem('Styles', `${report.styles.length} styles`, 'category');
                stylesItem.children = report.styles.map(s =>
                    new PropertyItem(s.name, s.parentStyle ? `extends ${s.parentStyle}` : (s.isDefault ? 'default' : 'custom'), 'property')
                );
                items.push(stylesItem);
            }

            const elementCounts = this.countAllElements(report.bands);
            if (elementCounts.length > 0) {
                const countsItem = new PropertyItem('Element Statistics', '', 'category');
                countsItem.children = elementCounts.map(ec =>
                    new PropertyItem(ec.type, `${ec.count} elements`, 'stat')
                );
                items.push(countsItem);
            }

            return items;
        } catch (error) {
            return [new PropertyItem('Error parsing JRXML', (error as Error).message, 'error')];
        }
    }

    private countAllElements(bands: Array<{ elements: JrxmlElement[] }>): Array<{ type: string; count: number }> {
        const counts = new Map<string, number>();

        const visit = (el: JrxmlElement) => {
            counts.set(el.type, (counts.get(el.type) || 0) + 1);
            if (el.children) {
                el.children.forEach(visit);
            }
        };

        for (const band of bands) {
            for (const el of band.elements) {
                visit(el);
            }
        }

        return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
    }
}

export class PropertyItem extends vscode.TreeItem {
    public children?: PropertyItem[];

    constructor(
        public readonly label: string,
        public readonly value: string,
        public readonly type: 'category' | 'property' | 'info' | 'error' | 'band' | 'parameter' | 'variable' | 'stat'
    ) {
        super(
            label,
            type === 'category' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
        );

        if (value) {
            this.description = value;
        }

        this.contextValue = type;
        this.iconPath = this.getIcon(type);
    }

    private getIcon(type: string): vscode.ThemeIcon {
        switch (type) {
            case 'category': return new vscode.ThemeIcon('folder');
            case 'property': return new vscode.ThemeIcon('symbol-property');
            case 'band': return new vscode.ThemeIcon('symbol-namespace');
            case 'parameter': return new vscode.ThemeIcon('symbol-parameter');
            case 'variable': return new vscode.ThemeIcon('symbol-variable');
            case 'stat': return new vscode.ThemeIcon('graph');
            case 'error': return new vscode.ThemeIcon('error');
            default: return new vscode.ThemeIcon('info');
        }
    }
}
