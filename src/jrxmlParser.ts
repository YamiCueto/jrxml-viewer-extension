import { parseJrxmlDocument } from './model/jrxmlDocumentParser';
import { JrxmlElement as ModelElement, JrxmlBand as ModelBand } from './model/jrxmlDocumentModel';

export { parseJrxmlDocument } from './model/jrxmlDocumentParser';
export * from './model/jrxmlDocumentModel';

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
    calculation?: string;
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
    const doc = parseJrxmlDocument(xmlContent);
    const rep = doc.report;

    return {
        name: rep.name,
        pageWidth: rep.pageWidth,
        pageHeight: rep.pageHeight,
        orientation: rep.orientation,
        columnWidth: rep.columnWidth,
        leftMargin: rep.leftMargin,
        rightMargin: rep.rightMargin,
        topMargin: rep.topMargin,
        bottomMargin: rep.bottomMargin,
        parameters: rep.parameters.map(p => ({
            name: p.name,
            class: p.class,
            isForPrompting: p.isForPrompting,
            defaultValueExpression: p.defaultValueExpression?.raw
        })),
        fields: rep.fields.map(f => ({
            name: f.name,
            class: f.class
        })),
        variables: rep.variables.map(v => ({
            name: v.name,
            class: v.class,
            calculation: v.calculation,
            expression: v.expression?.raw
        })),
        groups: rep.groups.map(g => ({
            name: g.name,
            expression: g.expression.raw
        })),
        bands: rep.bands.map(b => ({
            type: b.type,
            height: b.height,
            elements: flattenModelElements(b.elements)
        }))
    };
}

function flattenModelElements(elements: ModelElement[]): JrxmlElement[] {
    const result: JrxmlElement[] = [];

    for (const el of elements) {
        result.push({
            type: el.type,
            x: el.geometry.x,
            y: el.geometry.y,
            width: el.geometry.width,
            height: el.geometry.height,
            text: el.text,
            expression: el.expression?.raw || el.subreportExpression?.raw || el.chartType || '',
            fontSize: el.fontSize,
            fontName: el.fontName,
            isBold: el.isBold,
            textAlignment: el.horizontalAlignment,
            verticalAlignment: el.verticalAlignment,
            forecolor: el.forecolor,
            backcolor: el.backcolor,
            mode: el.mode,
            pattern: el.pattern
        });

        if (el.children && el.children.length > 0) {
            result.push(...flattenModelElements(el.children));
        }
    }

    return result;
}
