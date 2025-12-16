import * as vscode from 'vscode';
import { XMLParser } from 'fast-xml-parser';

export class JrxmlPropertiesProvider implements vscode.TreeDataProvider<PropertyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PropertyItem | undefined | null | void> = new vscode.EventEmitter<PropertyItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PropertyItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;

    constructor() {
        // Listen to active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.fileName.endsWith('.jrxml')) {
                this.currentDocument = editor.document;
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
        this._onDidChangeTreeData.fire();
    }

    setCurrentDocument(document: vscode.TextDocument): void {
        this.currentDocument = document;
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
            // Return children of this property if any
            return element.children || [];
        }

        try {
            const xmlContent = this.currentDocument.getText();
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_',
                textNodeName: '#text',
                parseAttributeValue: true,
                trimValues: true
            });
            const parsed = parser.parse(xmlContent);

            const items: PropertyItem[] = [];

            // Document properties
            if (parsed.jasperReport) {
                const report = parsed.jasperReport;
                
                // Basic info
                const basicInfo = new PropertyItem('Document Info', '', 'category');
                basicInfo.children = [
                    new PropertyItem('Name', report['@_name'] || 'Unnamed', 'property'),
                    new PropertyItem('Page Width', `${report['@_pageWidth'] || 'N/A'}px`, 'property'),
                    new PropertyItem('Page Height', `${report['@_pageHeight'] || 'N/A'}px`, 'property'),
                    new PropertyItem('Orientation', report['@_orientation'] || 'Portrait', 'property'),
                ];
                items.push(basicInfo);

                // Margins
                const margins = new PropertyItem('Margins', '', 'category');
                margins.children = [
                    new PropertyItem('Top', `${report['@_topMargin'] || 0}px`, 'property'),
                    new PropertyItem('Bottom', `${report['@_bottomMargin'] || 0}px`, 'property'),
                    new PropertyItem('Left', `${report['@_leftMargin'] || 0}px`, 'property'),
                    new PropertyItem('Right', `${report['@_rightMargin'] || 0}px`, 'property'),
                ];
                items.push(margins);

                // Bands
                const bands = this.extractBands(report);
                if (bands.length > 0) {
                    const bandsItem = new PropertyItem('Bands', `${bands.length} bands`, 'category');
                    bandsItem.children = bands.map(band => 
                        new PropertyItem(band.type, `height: ${band.height}px`, 'band')
                    );
                    items.push(bandsItem);
                }

                // Parameters
                const parameters = this.extractParameters(report);
                if (parameters.length > 0) {
                    const paramsItem = new PropertyItem('Parameters', `${parameters.length} parameters`, 'category');
                    paramsItem.children = parameters.map(param => 
                        new PropertyItem(param.name, param.class, 'parameter')
                    );
                    items.push(paramsItem);
                }

                // Variables
                const variables = this.extractVariables(report);
                if (variables.length > 0) {
                    const varsItem = new PropertyItem('Variables', `${variables.length} variables`, 'category');
                    varsItem.children = variables.map(v => 
                        new PropertyItem(v.name, v.class, 'variable')
                    );
                    items.push(varsItem);
                }

                // Element counts
                const elementCounts = this.countElements(report);
                if (elementCounts.length > 0) {
                    const countsItem = new PropertyItem('Element Statistics', '', 'category');
                    countsItem.children = elementCounts.map(ec => 
                        new PropertyItem(ec.type, `${ec.count} elements`, 'stat')
                    );
                    items.push(countsItem);
                }
            }

            return items;
        } catch (error) {
            return [new PropertyItem('Error parsing JRXML', (error as Error).message, 'error')];
        }
    }

    private extractBands(report: any): Array<{type: string, height: string}> {
        const bands = [];
        const bandTypes = ['title', 'pageHeader', 'columnHeader', 'detail', 'columnFooter', 'pageFooter', 'summary'];
        
        for (const bandType of bandTypes) {
            if (report[bandType]) {
                bands.push({
                    type: bandType,
                    height: report[bandType]['@_height'] || '0'
                });
            }
        }
        
        return bands;
    }

    private extractParameters(report: any): Array<{name: string, class: string}> {
        const params = [];
        const paramArray = Array.isArray(report.parameter) ? report.parameter : (report.parameter ? [report.parameter] : []);
        
        for (const param of paramArray) {
            params.push({
                name: param['@_name'] || 'unnamed',
                class: param['@_class'] || 'java.lang.String'
            });
        }
        
        return params;
    }

    private extractVariables(report: any): Array<{name: string, class: string}> {
        const vars = [];
        const varArray = Array.isArray(report.variable) ? report.variable : (report.variable ? [report.variable] : []);
        
        for (const v of varArray) {
            vars.push({
                name: v['@_name'] || 'unnamed',
                class: v['@_class'] || 'java.lang.String'
            });
        }
        
        return vars;
    }

    private countElements(report: any): Array<{type: string, count: number}> {
        const counts = new Map<string, number>();
        
        const countInBand = (band: any) => {
            if (!band) return;
            
            const elements = ['staticText', 'textField', 'image', 'rectangle', 'ellipse', 'line', 'chart', 'subreport'];
            for (const elemType of elements) {
                if (band[elemType]) {
                    const elemArray = Array.isArray(band[elemType]) ? band[elemType] : [band[elemType]];
                    counts.set(elemType, (counts.get(elemType) || 0) + elemArray.length);
                }
            }
        };
        
        const bandTypes = ['title', 'pageHeader', 'columnHeader', 'detail', 'columnFooter', 'pageFooter', 'summary'];
        for (const bandType of bandTypes) {
            countInBand(report[bandType]);
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
