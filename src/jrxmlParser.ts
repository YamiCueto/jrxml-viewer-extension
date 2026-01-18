import { XMLParser } from 'fast-xml-parser';
import { outputChannel } from './extension';

export interface JrxmlReport {
    name: string;
    pageWidth: number;
    pageHeight: number;
    orientation: string;
    columnWidth: number;
    leftMargin: number;
    rightMargin: number;
    topMargin: number;
    bottomMargin: number;
    parameters: JrxmlParameter[];
    fields: JrxmlField[];
    variables: JrxmlVariable[];
    groups: JrxmlGroup[];
    bands: JrxmlBand[];
}

export interface JrxmlParameter {
    name: string;
    class: string;
    isForPrompting?: boolean;
    defaultValueExpression?: string;
}

export interface JrxmlField {
    name: string;
    class: string;
}

export interface JrxmlVariable {
    name: string;
    class: string;
    calculation: string;
    expression?: string;
}

export interface JrxmlGroup {
    name: string;
    expression: string;
}

export interface JrxmlBand {
    type: string;
    height: number;
    elements: JrxmlElement[];
}

export interface JrxmlElement {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    expression?: string;
    fontSize?: number;
    fontName?: string;
    isBold?: boolean;
    textAlignment?: string;
    verticalAlignment?: string;
    forecolor?: string;
    backcolor?: string;
    mode?: string;
    pattern?: string;
}

export function parseJrxml(xmlContent: string): JrxmlReport {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        parseAttributeValue: false,
        parseTagValue: false,
        trimValues: true,
        ignoreDeclaration: true,
        isArray: (name: string) => {
            return ['parameter', 'field', 'variable', 'group', 'band', 
                    'staticText', 'textField', 'image', 'line', 'rectangle'].includes(name);
        }
    });

    const parsed = parser.parse(xmlContent);
    // Support possible namespaces by finding a key that contains 'jasperReport' (case-insensitive)
    let jasperReport = parsed.jasperReport;
    if (!jasperReport) {
        const key = Object.keys(parsed).find(k => k.toLowerCase().includes('jasperreport'));
        if (key) {
            // @ts-ignore
            jasperReport = parsed[key];
        }
    }

    if (!jasperReport) {
        throw new Error('No jasperReport element found in XML');
    }

    // Diagnostic: log top-level keys of jasperReport to help debugging
    try {
        const keys = Object.keys(jasperReport || {}).slice(0, 50).join(',');
        outputChannel.appendLine(`[Parser] jasperReport keys: ${keys}`);
    } catch (e) {
        // ignore
    }
    // Further diagnostics: dump a truncated JSON of jasperReport and check bandType nodes
    try {
        const dumped = JSON.stringify(jasperReport, null, 2).substring(0, 8000).replace(/\n/g, '\\n');
        outputChannel.appendLine(`[Parser] jasperReport dump (truncated): ${dumped}`);
    } catch (e) {
        // ignore
    }
    try {
        const bandTypes = [
            'title', 'pageHeader', 'columnHeader', 'detail',
            'columnFooter', 'pageFooter', 'summary', 'background',
            'lastPageFooter', 'noData'
        ];
        bandTypes.forEach(bt => {
            const node = findNode(jasperReport, bt);
            if (node === undefined) {
                outputChannel.appendLine(`[Parser] findNode('${bt}') => undefined`);
            } else {
                const info = typeof node === 'string' ? `string(${(node as string).length})` : `object keys:${Object.keys(node).length}`;
                outputChannel.appendLine(`[Parser] findNode('${bt}') => ${info}`);
            }
        });
    } catch (e) {
        // ignore
    }

    const report: JrxmlReport = {
        name: jasperReport['@_name'] || 'Unnamed Report',
        pageWidth: parseInt(jasperReport['@_pageWidth'] || '595'),
        pageHeight: parseInt(jasperReport['@_pageHeight'] || '842'),
        orientation: jasperReport['@_orientation'] || 'Portrait',
        columnWidth: parseInt(jasperReport['@_columnWidth'] || '555'),
        leftMargin: parseInt(jasperReport['@_leftMargin'] || '20'),
        rightMargin: parseInt(jasperReport['@_rightMargin'] || '20'),
        topMargin: parseInt(jasperReport['@_topMargin'] || '20'),
        bottomMargin: parseInt(jasperReport['@_bottomMargin'] || '20'),
        parameters: [],
        fields: [],
        variables: [],
        groups: [],
        bands: []
    };

    // Helper to find node by name with namespace/prefix tolerance, recursively
    function findNode(obj: any, name: string, depth = 0): any {
        if (!obj || depth > 6) return undefined;
        if (obj[name] !== undefined) return obj[name];
        const lower = name.toLowerCase();
        // direct match or contains
        const directKey = Object.keys(obj).find(k => k.toLowerCase() === lower || k.toLowerCase().includes(lower));
        if (directKey) return obj[directKey];
        // recurse into child objects
        for (const k of Object.keys(obj)) {
            const child = obj[k];
            if (child && typeof child === 'object') {
                const found = findNode(child, name, depth + 1);
                if (found !== undefined) return found;
            }
        }
        return undefined;
    }

    function toArray(node: any) {
        if (node === undefined || node === null) return [];
        return Array.isArray(node) ? node : [node];
    }

    // Parse parameters
    const parameters = toArray(findNode(jasperReport, 'parameter'));
    parameters.forEach((param: any) => {
        report.parameters.push({
            name: param['@_name'] || '',
            class: param['@_class'] || '',
            isForPrompting: param['@_isForPrompting'] === 'true',
            defaultValueExpression: param.defaultValueExpression || undefined
        });
    });

    // Parse fields
    const fields = toArray(findNode(jasperReport, 'field'));
    fields.forEach((field: any) => {
        report.fields.push({
            name: field['@_name'] || '',
            class: field['@_class'] || ''
        });
    });

    // Parse variables
    const variables = toArray(findNode(jasperReport, 'variable'));
    variables.forEach((variable: any) => {
        report.variables.push({
            name: variable['@_name'] || '',
            class: variable['@_class'] || '',
            calculation: variable['@_calculation'] || 'Nothing',
            expression: variable.variableExpression || undefined
        });
    });

    // Parse groups
    const groups = toArray(findNode(jasperReport, 'group'));
    groups.forEach((group: any) => {
        report.groups.push({
            name: group['@_name'] || '',
            expression: group.groupExpression || ''
        });
    });

    // Parse bands
    const bandTypes = [
        'title', 'pageHeader', 'columnHeader', 'detail', 
        'columnFooter', 'pageFooter', 'summary', 'background',
        'lastPageFooter', 'noData'
    ];

    bandTypes.forEach(bandType => {
        const bandContainer = findNode(jasperReport, bandType);
        if (bandContainer) {
            const bands = toArray(bandContainer.band || bandContainer);
            bands.forEach((band: any) => {
                report.bands.push({
                    type: bandType,
                    height: parseInt(band['@_height'] || '0'),
                    elements: parseBandElements(band)
                });
            });
        }
    });

    // Parse group bands
    groups.forEach((group: any) => {
        const groupName = group['@_name'] || 'group';
        
        if (group.groupHeader && group.groupHeader.band) {
            const bands = Array.isArray(group.groupHeader.band) ? group.groupHeader.band : [group.groupHeader.band];
            bands.forEach((band: any) => {
                report.bands.push({
                    type: `groupHeader-${groupName}`,
                    height: parseInt(band['@_height'] || '0'),
                    elements: parseBandElements(band)
                });
            });
        }

        if (group.groupFooter && group.groupFooter.band) {
            const bands = Array.isArray(group.groupFooter.band) ? group.groupFooter.band : [group.groupFooter.band];
            bands.forEach((band: any) => {
                report.bands.push({
                    type: `groupFooter-${groupName}`,
                    height: parseInt(band['@_height'] || '0'),
                    elements: parseBandElements(band)
                });
            });
        }
    });

    return report;
}

function parseBandElements(band: any): JrxmlElement[] {
    const elements: JrxmlElement[] = [];

    // Parse static texts
    const staticTexts = Array.isArray(band.staticText) ? band.staticText : 
                        band.staticText ? [band.staticText] : [];
    staticTexts.forEach((element: any) => {
        const reportElement = element.reportElement;
        const textElement = element.textElement;
        const text = element.text;
        
        if (reportElement) {
            elements.push({
                type: 'staticText',
                x: parseInt(reportElement['@_x'] || '0'),
                y: parseInt(reportElement['@_y'] || '0'),
                width: parseInt(reportElement['@_width'] || '0'),
                height: parseInt(reportElement['@_height'] || '0'),
                text: text || '',
                forecolor: reportElement['@_forecolor'] || undefined,
                backcolor: reportElement['@_backcolor'] || undefined,
                mode: reportElement['@_mode'] || undefined,
                ...parseTextElement(textElement)
            });
        }
    });

    // Parse text fields
    const textFields = Array.isArray(band.textField) ? band.textField : 
                       band.textField ? [band.textField] : [];
    textFields.forEach((element: any) => {
        const reportElement = element.reportElement;
        const textElement = element.textElement;
        const expression = element.textFieldExpression;
        
        if (reportElement) {
            elements.push({
                type: 'textField',
                x: parseInt(reportElement['@_x'] || '0'),
                y: parseInt(reportElement['@_y'] || '0'),
                width: parseInt(reportElement['@_width'] || '0'),
                height: parseInt(reportElement['@_height'] || '0'),
                expression: expression || '',
                pattern: element['@_pattern'] || undefined,
                forecolor: reportElement['@_forecolor'] || undefined,
                backcolor: reportElement['@_backcolor'] || undefined,
                mode: reportElement['@_mode'] || undefined,
                ...parseTextElement(textElement)
            });
        }
    });

    // Parse images
    const images = Array.isArray(band.image) ? band.image : 
                   band.image ? [band.image] : [];
    images.forEach((element: any) => {
        const reportElement = element.reportElement;
        
        if (reportElement) {
            elements.push({
                type: 'image',
                x: parseInt(reportElement['@_x'] || '0'),
                y: parseInt(reportElement['@_y'] || '0'),
                width: parseInt(reportElement['@_width'] || '0'),
                height: parseInt(reportElement['@_height'] || '0')
            });
        }
    });

    // Parse lines
    const lines = Array.isArray(band.line) ? band.line : 
                  band.line ? [band.line] : [];
    lines.forEach((element: any) => {
        const reportElement = element.reportElement;
        
        if (reportElement) {
            elements.push({
                type: 'line',
                x: parseInt(reportElement['@_x'] || '0'),
                y: parseInt(reportElement['@_y'] || '0'),
                width: parseInt(reportElement['@_width'] || '0'),
                height: parseInt(reportElement['@_height'] || '0')
            });
        }
    });

    // Parse rectangles
    const rectangles = Array.isArray(band.rectangle) ? band.rectangle : 
                       band.rectangle ? [band.rectangle] : [];
    rectangles.forEach((element: any) => {
        const reportElement = element.reportElement;
        
        if (reportElement) {
            elements.push({
                type: 'rectangle',
                x: parseInt(reportElement['@_x'] || '0'),
                y: parseInt(reportElement['@_y'] || '0'),
                width: parseInt(reportElement['@_width'] || '0'),
                height: parseInt(reportElement['@_height'] || '0'),
                backcolor: reportElement['@_backcolor'] || undefined,
                mode: reportElement['@_mode'] || undefined
            });
        }
    });

    // Parse subreports
    const subreports = Array.isArray(band.subreport) ? band.subreport : 
                       band.subreport ? [band.subreport] : [];
    subreports.forEach((element: any) => {
        const reportElement = element.reportElement;
        
        if (reportElement) {
            elements.push({
                type: 'subreport',
                x: parseInt(reportElement['@_x'] || '0'),
                y: parseInt(reportElement['@_y'] || '0'),
                width: parseInt(reportElement['@_width'] || '0'),
                height: parseInt(reportElement['@_height'] || '0'),
                expression: element.subreportExpression || 'Subreport'
            });
        }
    });

    // Parse charts
    const charts = Array.isArray(band.chart) ? band.chart : 
                   band.chart ? [band.chart] : [];
    charts.forEach((element: any) => {
        const reportElement = element.reportElement;
        const chartType = element['@_chartType'] || 'chart';
        
        if (reportElement) {
            elements.push({
                type: 'chart',
                x: parseInt(reportElement['@_x'] || '0'),
                y: parseInt(reportElement['@_y'] || '0'),
                width: parseInt(reportElement['@_width'] || '0'),
                height: parseInt(reportElement['@_height'] || '0'),
                expression: chartType
            });
        }
    });

    return elements;
}

function parseTextElement(textElement: any | null): Partial<JrxmlElement> {
    if (!textElement) {
        return {};
    }

    const font = textElement.font;
    
    return {
        textAlignment: textElement['@_textAlignment'] || undefined,
        verticalAlignment: textElement['@_verticalAlignment'] || undefined,
        fontName: font?.['@_fontName'] || undefined,
        fontSize: font ? parseInt(font['@_size'] || '10') : undefined,
        isBold: font?.['@_isBold'] === 'true'
    };
}
