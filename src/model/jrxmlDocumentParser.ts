import { XMLParser } from 'fast-xml-parser';
import {
    JrxmlDocument,
    JrxmlReport,
    JrxmlStyle,
    JrxmlConditionalStyle,
    JrxmlBarcodeComponent,
    JrxmlBarcodeType,
    JrxmlParameter,
    JrxmlField,
    JrxmlVariable,
    JrxmlGroup,
    JrxmlBand,
    JrxmlElement,
    JrxmlGeometry,
    JrxmlBox,
    JrxmlPen,
    JrxmlExpression,
    JrxmlSubreportParameter
} from './jrxmlDocumentModel';

export function parseJrxmlDocument(xmlContent: string): JrxmlDocument {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: false,
        parseTagValue: false,
        trimValues: true,
        ignoreDeclaration: true,
        isArray: (name: string) => {
            return [
                'property',
                'style',
                'conditionalStyle',
                'componentElement',
                'parameter',
                'field',
                'variable',
                'group',
                'band',
                'frame',
                'elementGroup',
                'staticText',
                'textField',
                'image',
                'line',
                'rectangle',
                'ellipse',
                'subreport',
                'subreportParameter',
                'chart',
                'barChart',
                'pieChart',
                'lineChart',
                'stackedBarChart',
                'areaChart',
                'stackedAreaChart',
                'xyLineChart',
                'scatterChart',
                'bubbleChart',
                'timeSeriesChart',
                'meterChart',
                'thermometerChart',
                'multiAxisChart',
                'ganttChart',
                'categorySeries'
            ].includes(name);
        }
    });

    const parsed = parser.parse(xmlContent);
    let jasperReport = parsed.jasperReport;
    if (!jasperReport) {
        const key = Object.keys(parsed).find(k => k.toLowerCase().includes('jasperreport'));
        if (key) {
            jasperReport = parsed[key];
        }
    }

    if (Array.isArray(jasperReport)) {
        jasperReport = jasperReport[0];
    }

    if (!jasperReport) {
        throw new Error('No jasperReport element found in XML');
    }

    const report: JrxmlReport = {
        name: jasperReport['@_name'] || 'Unnamed Report',
        language: jasperReport['@_language'] || undefined,
        pageWidth: parseInt(jasperReport['@_pageWidth'] || '595', 10),
        pageHeight: parseInt(jasperReport['@_pageHeight'] || '842', 10),
        orientation: jasperReport['@_orientation'] || 'Portrait',
        columnWidth: parseInt(jasperReport['@_columnWidth'] || '555', 10),
        columnSpacing: parseInt(jasperReport['@_columnSpacing'] || '0', 10),
        leftMargin: parseInt(jasperReport['@_leftMargin'] || '20', 10),
        rightMargin: parseInt(jasperReport['@_rightMargin'] || '20', 10),
        topMargin: parseInt(jasperReport['@_topMargin'] || '20', 10),
        bottomMargin: parseInt(jasperReport['@_bottomMargin'] || '20', 10),
        uuid: jasperReport['@_uuid'] || undefined,
        whenNoDataType: jasperReport['@_whenNoDataType'] || undefined,
        properties: parseProperties(jasperReport),
        styles: parseStyles(jasperReport),
        parameters: parseParameters(jasperReport),
        fields: parseFields(jasperReport),
        variables: parseVariables(jasperReport),
        groups: parseGroups(jasperReport),
        bands: parseBands(jasperReport),
        queryString: parseQueryString(jasperReport)
    };

    const doc: JrxmlDocument = { report };
    assignStructuralIds(doc);
    return doc;
}

function assignStructuralIds(doc: JrxmlDocument): void {
    for (const band of doc.report.bands) {
        assignIdsToElements(band.elements, `band:${band.type}`);
    }
}

function assignIdsToElements(elements: JrxmlElement[], prefix: string): void {
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        el.id = `${prefix}/el:${i}`;
        if (el.children && el.children.length > 0) {
            assignIdsToElements(el.children, el.id);
        }
    }
}

function toArray(val: any): any[] {
    if (val === undefined || val === null) {
        return [];
    }
    return Array.isArray(val) ? val : [val];
}

function extractFirst(val: any): any {
    if (Array.isArray(val)) {
        return val[0];
    }
    return val;
}

function extractText(node: any): string | undefined {
    if (node === undefined || node === null) {
        return undefined;
    }
    if (typeof node === 'string') {
        return node;
    }
    if (typeof node === 'number' || typeof node === 'boolean') {
        return String(node);
    }
    if (node['#text'] !== undefined) {
        return String(node['#text']);
    }
    return undefined;
}

function parseExpression(node: any): JrxmlExpression | undefined {
    const raw = extractText(node);
    if (raw === undefined || raw === null) {return undefined;}

    const trimmed = raw.trim();
    const fieldMatch = trimmed.match(/^\$F\{([^}]+)\}$/);
    if (fieldMatch) {
        return { raw: trimmed, type: 'field', name: fieldMatch[1] };
    }

    const paramMatch = trimmed.match(/^\$P\{([^}]+)\}$/);
    if (paramMatch) {
        return { raw: trimmed, type: 'parameter', name: paramMatch[1] };
    }

    const varMatch = trimmed.match(/^\$V\{([^}]+)\}$/);
    if (varMatch) {
        return { raw: trimmed, type: 'variable', name: varMatch[1] };
    }

    return { raw: trimmed, type: 'custom' };
}

function parseProperties(reportNode: any): Record<string, string> {
    const properties: Record<string, string> = {};
    const propNodes = toArray(reportNode.property);
    for (const p of propNodes) {
        const name = p['@_name'];
        const value = p['@_value'] !== undefined ? String(p['@_value']) : extractText(p) || '';
        if (name) {
            properties[name] = value;
        }
    }
    return properties;
}

function parsePen(penNode: any): JrxmlPen | undefined {
    const pen = extractFirst(penNode);
    if (!pen) {return undefined;}
    return {
        lineWidth: pen['@_lineWidth'] !== undefined ? parseFloat(pen['@_lineWidth']) : undefined,
        lineColor: pen['@_lineColor'] || undefined,
        lineStyle: pen['@_lineStyle'] || undefined
    };
}

function parseBox(boxNode: any): JrxmlBox | undefined {
    const box = extractFirst(boxNode);
    if (!box) {return undefined;}
    return {
        topPadding: box['@_topPadding'] !== undefined ? parseInt(box['@_topPadding'], 10) : undefined,
        bottomPadding: box['@_bottomPadding'] !== undefined ? parseInt(box['@_bottomPadding'], 10) : undefined,
        leftPadding: box['@_leftPadding'] !== undefined ? parseInt(box['@_leftPadding'], 10) : undefined,
        rightPadding: box['@_rightPadding'] !== undefined ? parseInt(box['@_rightPadding'], 10) : undefined,
        pen: parsePen(box.pen),
        topPen: parsePen(box.topPen),
        bottomPen: parsePen(box.bottomPen),
        leftPen: parsePen(box.leftPen),
        rightPen: parsePen(box.rightPen)
    };
}

function parseConditionalStyles(styleNode: any): JrxmlConditionalStyle[] | undefined {
    const condNodes = toArray(styleNode.conditionalStyle);
    if (condNodes.length === 0) {return undefined;}

    const result: JrxmlConditionalStyle[] = [];
    for (const cn of condNodes) {
        const condExpr = parseExpression(cn.conditionExpression);
        if (!condExpr) {continue;}

        const subStyle = extractFirst(cn.style) || cn;
        const font = extractFirst(subStyle.font);

        result.push({
            conditionExpression: condExpr,
            style: {
                fontName: subStyle['@_fontName'] || font?.['@_fontName'] || undefined,
                fontSize: subStyle['@_fontSize'] !== undefined ? parseInt(subStyle['@_fontSize'], 10) : (font?.['@_size'] !== undefined ? parseInt(font['@_size'], 10) : undefined),
                isBold: subStyle['@_isBold'] === 'true' || subStyle['@_isBold'] === true || font?.['@_isBold'] === 'true' || font?.['@_isBold'] === true || undefined,
                isItalic: subStyle['@_isItalic'] === 'true' || subStyle['@_isItalic'] === true || font?.['@_isItalic'] === 'true' || font?.['@_isItalic'] === true || undefined,
                isUnderline: subStyle['@_isUnderline'] === 'true' || subStyle['@_isUnderline'] === true || font?.['@_isUnderline'] === 'true' || font?.['@_isUnderline'] === true || undefined,
                isStrikeThrough: subStyle['@_isStrikeThrough'] === 'true' || subStyle['@_isStrikeThrough'] === true || font?.['@_isStrikeThrough'] === 'true' || font?.['@_isStrikeThrough'] === true || undefined,
                forecolor: subStyle['@_forecolor'] || undefined,
                backcolor: subStyle['@_backcolor'] || undefined,
                mode: subStyle['@_mode'] || undefined,
                horizontalAlignment: subStyle['@_hTextAlign'] || subStyle['@_hAlign'] || subStyle['@_horizontalAlignment'] || undefined,
                verticalAlignment: subStyle['@_vTextAlign'] || subStyle['@_vAlign'] || subStyle['@_verticalAlignment'] || undefined,
                pattern: subStyle['@_pattern'] || undefined,
                box: parseBox(subStyle.box)
            }
        });
    }
    return result.length > 0 ? result : undefined;
}

function parseStyles(reportNode: any): JrxmlStyle[] {
    const styles: JrxmlStyle[] = [];
    const styleNodes = toArray(reportNode.style);
    for (const s of styleNodes) {
        styles.push({
            name: s['@_name'] || '',
            parentStyle: s['@_style'] || undefined,
            isDefault: s['@_isDefault'] === 'true' || s['@_isDefault'] === true,
            fontName: s['@_fontName'] || undefined,
            fontSize: s['@_fontSize'] !== undefined ? parseInt(s['@_fontSize'], 10) : undefined,
            isBold: s['@_isBold'] === 'true' || s['@_isBold'] === true,
            isItalic: s['@_isItalic'] === 'true' || s['@_isItalic'] === true,
            isUnderline: s['@_isUnderline'] === 'true' || s['@_isUnderline'] === true,
            isStrikeThrough: s['@_isStrikeThrough'] === 'true' || s['@_isStrikeThrough'] === true,
            forecolor: s['@_forecolor'] || undefined,
            backcolor: s['@_backcolor'] || undefined,
            mode: s['@_mode'] || undefined,
            horizontalAlignment: s['@_hTextAlign'] || s['@_hAlign'] || s['@_horizontalAlignment'] || undefined,
            verticalAlignment: s['@_vTextAlign'] || s['@_vAlign'] || s['@_verticalAlignment'] || undefined,
            pattern: s['@_pattern'] || undefined,
            box: parseBox(s.box),
            conditionalStyles: parseConditionalStyles(s)
        });
    }
    return styles;
}

function parseParameters(reportNode: any): JrxmlParameter[] {
    const parameters: JrxmlParameter[] = [];
    const paramNodes = toArray(reportNode.parameter);
    for (const p of paramNodes) {
        parameters.push({
            name: p['@_name'] || '',
            class: p['@_class'] || 'java.lang.String',
            isForPrompting: p['@_isForPrompting'] !== 'false' && p['@_isForPrompting'] !== false,
            defaultValueExpression: parseExpression(p.defaultValueExpression)
        });
    }
    return parameters;
}

function parseFields(reportNode: any): JrxmlField[] {
    const fields: JrxmlField[] = [];
    const fieldNodes = toArray(reportNode.field);
    for (const f of fieldNodes) {
        fields.push({
            name: f['@_name'] || '',
            class: f['@_class'] || 'java.lang.String'
        });
    }
    return fields;
}

function parseVariables(reportNode: any): JrxmlVariable[] {
    const variables: JrxmlVariable[] = [];
    const varNodes = toArray(reportNode.variable);
    for (const v of varNodes) {
        variables.push({
            name: v['@_name'] || '',
            class: v['@_class'] || 'java.lang.String',
            calculation: v['@_calculation'] || 'Nothing',
            resetType: v['@_resetType'] || undefined,
            resetGroup: v['@_resetGroup'] || undefined,
            expression: parseExpression(v.variableExpression)
        });
    }
    return variables;
}

function parseGroups(reportNode: any): JrxmlGroup[] {
    const groups: JrxmlGroup[] = [];
    const groupNodes = toArray(reportNode.group);
    for (const g of groupNodes) {
        const group: JrxmlGroup = {
            name: g['@_name'] || '',
            expression: parseExpression(g.groupExpression) || { raw: '', type: 'custom' },
            isStartNewPage: g['@_isStartNewPage'] === 'true' || g['@_isStartNewPage'] === true,
            isReprintHeaderOnEachPage: g['@_isReprintHeaderOnEachPage'] === 'true' || g['@_isReprintHeaderOnEachPage'] === true
        };

        if (g.groupHeader) {
            const bands = toArray(g.groupHeader.band || g.groupHeader);
            if (bands.length > 0) {
                const b = bands[0];
                group.groupHeader = {
                    type: `groupHeader-${group.name}`,
                    name: group.name,
                    height: parseInt(b['@_height'] || '0', 10),
                    splitType: b['@_splitType'] || undefined,
                    elements: parseElementsFromContainer(b)
                };
            }
        }

        if (g.groupFooter) {
            const bands = toArray(g.groupFooter.band || g.groupFooter);
            if (bands.length > 0) {
                const b = bands[0];
                group.groupFooter = {
                    type: `groupFooter-${group.name}`,
                    name: group.name,
                    height: parseInt(b['@_height'] || '0', 10),
                    splitType: b['@_splitType'] || undefined,
                    elements: parseElementsFromContainer(b)
                };
            }
        }

        groups.push(group);
    }
    return groups;
}

function parseBands(reportNode: any): JrxmlBand[] {
    const bands: JrxmlBand[] = [];
    const bandTypes = [
        'background',
        'title',
        'pageHeader',
        'columnHeader',
        'detail',
        'columnFooter',
        'pageFooter',
        'lastPageFooter',
        'summary',
        'noData'
    ];

    for (const bt of bandTypes) {
        const container = reportNode[bt];
        if (!container) {continue;}

        const bandNodes = toArray(container.band !== undefined ? container.band : container);
        for (const b of bandNodes) {
            bands.push({
                type: bt,
                height: parseInt(b['@_height'] || '0', 10),
                splitType: b['@_splitType'] || undefined,
                elements: parseElementsFromContainer(b)
            });
        }
    }

    const groupNodes = toArray(reportNode.group);
    for (const g of groupNodes) {
        const gName = g['@_name'] || 'group';
        if (g.groupHeader) {
            const bNodes = toArray(g.groupHeader.band || g.groupHeader);
            for (const b of bNodes) {
                bands.push({
                    type: `groupHeader-${gName}`,
                    name: gName,
                    height: parseInt(b['@_height'] || '0', 10),
                    splitType: b['@_splitType'] || undefined,
                    elements: parseElementsFromContainer(b)
                });
            }
        }
        if (g.groupFooter) {
            const bNodes = toArray(g.groupFooter.band || g.groupFooter);
            for (const b of bNodes) {
                bands.push({
                    type: `groupFooter-${gName}`,
                    name: gName,
                    height: parseInt(b['@_height'] || '0', 10),
                    splitType: b['@_splitType'] || undefined,
                    elements: parseElementsFromContainer(b)
                });
            }
        }
    }

    return bands;
}

function parseQueryString(reportNode: any): string | undefined {
    return extractText(reportNode.queryString);
}

function parseGeometry(reportElement: any): JrxmlGeometry {
    const rep = extractFirst(reportElement) || {};
    return {
        x: parseInt(rep['@_x'] || '0', 10),
        y: parseInt(rep['@_y'] || '0', 10),
        width: parseInt(rep['@_width'] || '0', 10),
        height: parseInt(rep['@_height'] || '0', 10),
        positionType: rep['@_positionType'] || undefined,
        stretchType: rep['@_stretchType'] || undefined
    };
}

function parseBaseProperties(elem: any): {
    geometry: JrxmlGeometry;
    uuid?: string;
    key?: string;
    styleName?: string;
    forecolor?: string;
    backcolor?: string;
    mode?: string;
    printWhenExpression?: JrxmlExpression;
} {
    const rep = extractFirst(elem.reportElement) || {};
    return {
        geometry: parseGeometry(rep),
        uuid: rep['@_uuid'] || undefined,
        key: rep['@_key'] || undefined,
        styleName: rep['@_style'] || undefined,
        forecolor: rep['@_forecolor'] || undefined,
        backcolor: rep['@_backcolor'] || undefined,
        mode: rep['@_mode'] || undefined,
        printWhenExpression: parseExpression(rep.printWhenExpression)
    };
}

function parseTextProperties(textElement: any): {
    horizontalAlignment?: string;
    verticalAlignment?: string;
    rotation?: string;
    markup?: string;
    fontName?: string;
    fontSize?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    isStrikeThrough?: boolean;
} {
    const te = extractFirst(textElement);
    if (!te) {return {};}
    const font = extractFirst(te.font);
    return {
        horizontalAlignment: te['@_textAlignment'] || undefined,
        verticalAlignment: te['@_verticalAlignment'] || undefined,
        rotation: te['@_rotation'] || undefined,
        markup: te['@_markup'] || undefined,
        fontName: font?.['@_fontName'] || undefined,
        fontSize: font?.['@_size'] !== undefined ? parseInt(font['@_size'], 10) : undefined,
        isBold: font?.['@_isBold'] === 'true' || font?.['@_isBold'] === true,
        isItalic: font?.['@_isItalic'] === 'true' || font?.['@_isItalic'] === true,
        isUnderline: font?.['@_isUnderline'] === 'true' || font?.['@_isUnderline'] === true,
        isStrikeThrough: font?.['@_isStrikeThrough'] === 'true' || font?.['@_isStrikeThrough'] === true
    };
}

function parseBarcodeComponent(elem: any): JrxmlBarcodeComponent | undefined {
    for (const key of Object.keys(elem)) {
        if (key === 'reportElement' || key === 'box' || key.startsWith('@_')) {continue;}
        const lowerKey = key.toLowerCase();
        let barcodeType: JrxmlBarcodeType | undefined;

        if (lowerKey.includes('qrcode')) {
            barcodeType = 'QRCode';
        } else if (lowerKey.includes('code128')) {
            barcodeType = 'Code128';
        } else if (lowerKey.includes('ean13')) {
            barcodeType = 'EAN13';
        } else if (lowerKey.includes('code39')) {
            barcodeType = 'Code39';
        } else if (lowerKey.includes('barbecue')) {
            const bNode = extractFirst(elem[key]);
            const bType = (bNode?.['@_type'] || '').toLowerCase();
            if (bType.includes('128')) {barcodeType = 'Code128';}
            else if (bType.includes('39')) {barcodeType = 'Code39';}
            else if (bType.includes('ean13') || bType.includes('ean-13')) {barcodeType = 'EAN13';}
            else {barcodeType = 'unknown';}
        }

        if (barcodeType) {
            const compNode = extractFirst(elem[key]) || {};
            const codeExpr = parseExpression(
                compNode['jr:codeExpression'] ||
                compNode['c:codeExpression'] ||
                compNode.codeExpression ||
                compNode['jr:code'] ||
                compNode.code
            );

            return {
                barcodeType,
                codeExpression: codeExpr,
                evaluationTime: compNode['@_evaluationTime'] || undefined,
                drawText: compNode['@_drawText'] !== 'false' && compNode['@_drawText'] !== false,
                checksumRequired: compNode['@_checksumRequired'] === 'true' || compNode['@_checksumRequired'] === true,
                errorCorrectionLevel: compNode['@_errorCorrectionLevel'] || undefined,
                barWidth: compNode['@_barWidth'] !== undefined ? parseFloat(compNode['@_barWidth']) : undefined,
                barHeight: compNode['@_barHeight'] !== undefined ? parseFloat(compNode['@_barHeight']) : undefined,
                quietZone: compNode['@_quietZone'] !== undefined ? parseFloat(compNode['@_quietZone']) : undefined,
                orientation: compNode['@_orientation'] || undefined
            };
        }
    }
    return undefined;
}

export function parseElementsFromContainer(containerNode: any): JrxmlElement[] {
    const elements: JrxmlElement[] = [];
    if (!containerNode || typeof containerNode !== 'object') {
        return elements;
    }

    const staticTexts = toArray(containerNode.staticText);
    for (const elem of staticTexts) {
        const base = parseBaseProperties(elem);
        const textProps = parseTextProperties(elem.textElement);
        elements.push({
            type: 'staticText',
            ...base,
            ...textProps,
            box: parseBox(elem.box),
            text: extractText(elem.text) || ''
        });
    }

    const textFields = toArray(containerNode.textField);
    for (const elem of textFields) {
        const base = parseBaseProperties(elem);
        const textProps = parseTextProperties(elem.textElement);
        elements.push({
            type: 'textField',
            ...base,
            ...textProps,
            box: parseBox(elem.box),
            pattern: elem['@_pattern'] || undefined,
            isBlankWhenNull: elem['@_isBlankWhenNull'] === 'true' || elem['@_isBlankWhenNull'] === true,
            evaluationTime: elem['@_evaluationTime'] || undefined,
            evaluationGroup: elem['@_evaluationGroup'] || undefined,
            isStretchWithOverflow: elem['@_isStretchWithOverflow'] === 'true' || elem['@_isStretchWithOverflow'] === true,
            expression: parseExpression(elem.textFieldExpression)
        });
    }

    const images = toArray(containerNode.image);
    for (const elem of images) {
        const base = parseBaseProperties(elem);
        elements.push({
            type: 'image',
            ...base,
            box: parseBox(elem.box),
            scaleImage: elem['@_scaleImage'] || undefined,
            imageExpression: parseExpression(elem.imageExpression)
        });
    }

    const lines = toArray(containerNode.line);
    for (const elem of lines) {
        const base = parseBaseProperties(elem);
        const graphic = extractFirst(elem.graphicElement) || {};
        elements.push({
            type: 'line',
            ...base,
            direction: elem['@_direction'] || undefined,
            pen: parsePen(graphic.pen)
        });
    }

    const rectangles = toArray(containerNode.rectangle);
    for (const elem of rectangles) {
        const base = parseBaseProperties(elem);
        const graphic = extractFirst(elem.graphicElement) || {};
        elements.push({
            type: 'rectangle',
            ...base,
            radius: elem['@_radius'] !== undefined ? parseInt(elem['@_radius'], 10) : undefined,
            pen: parsePen(graphic.pen),
            box: parseBox(elem.box)
        });
    }

    const ellipses = toArray(containerNode.ellipse);
    for (const elem of ellipses) {
        const base = parseBaseProperties(elem);
        const graphic = extractFirst(elem.graphicElement) || {};
        elements.push({
            type: 'ellipse',
            ...base,
            pen: parsePen(graphic.pen)
        });
    }

    const frames = toArray(containerNode.frame);
    for (const elem of frames) {
        const base = parseBaseProperties(elem);
        const children = parseElementsFromContainer(elem);
        elements.push({
            type: 'frame',
            ...base,
            box: parseBox(elem.box),
            children
        });
    }

    const elementGroups = toArray(containerNode.elementGroup);
    for (const elem of elementGroups) {
        const children = parseElementsFromContainer(elem);
        elements.push({
            type: 'elementGroup',
            geometry: { x: 0, y: 0, width: 0, height: 0 },
            children
        });
    }

    const componentElements = toArray(containerNode.componentElement);
    for (const elem of componentElements) {
        const base = parseBaseProperties(elem);
        const barcodeInfo = parseBarcodeComponent(elem);
        if (barcodeInfo) {
            elements.push({
                type: 'componentElement',
                componentType: 'barcode',
                barcodeComponent: barcodeInfo,
                ...base,
                box: parseBox(elem.box)
            });
        } else {
            elements.push({
                type: 'componentElement',
                ...base,
                box: parseBox(elem.box)
            });
        }
    }

    const subreports = toArray(containerNode.subreport);
    for (const elem of subreports) {
        const base = parseBaseProperties(elem);
        const subParams: JrxmlSubreportParameter[] = [];
        const paramNodes = toArray(elem.subreportParameter);
        for (const p of paramNodes) {
            subParams.push({
                name: p['@_name'] || '',
                expression: parseExpression(p.subreportParameterExpression)
            });
        }
        elements.push({
            type: 'subreport',
            ...base,
            subreportExpression: parseExpression(elem.subreportExpression),
            connectionExpression: parseExpression(elem.connectionExpression),
            dataSourceExpression: parseExpression(elem.dataSourceExpression),
            parameters: subParams.length > 0 ? subParams : undefined
        });
    }

    const chartTagNames = [
        'chart',
        'barChart',
        'pieChart',
        'lineChart',
        'stackedBarChart',
        'areaChart',
        'stackedAreaChart',
        'xyLineChart',
        'scatterChart',
        'bubbleChart',
        'timeSeriesChart',
        'meterChart',
        'thermometerChart',
        'multiAxisChart',
        'ganttChart'
    ];

    for (const tagName of chartTagNames) {
        const chartNodes = toArray(containerNode[tagName]);
        for (const elem of chartNodes) {
            const chartElem = extractFirst(elem.chart) || elem;
            const rep = extractFirst(chartElem.reportElement) || extractFirst(elem.reportElement) || {};
            const base = {
                geometry: parseGeometry(rep),
                uuid: rep['@_uuid'] || undefined,
                key: rep['@_key'] || undefined,
                styleName: rep['@_style'] || undefined,
                forecolor: rep['@_forecolor'] || undefined,
                backcolor: rep['@_backcolor'] || undefined,
                mode: rep['@_mode'] || undefined,
                printWhenExpression: parseExpression(rep.printWhenExpression)
            };

            const chartTitleNode = extractFirst(chartElem.chartTitle || elem.chartTitle);
            const chartSubtitleNode = extractFirst(chartElem.chartSubtitle || elem.chartSubtitle);
            const chartLegendNode = extractFirst(chartElem.chartLegend || elem.chartLegend);

            const categoryDatasetNode = extractFirst(elem.categoryDataset);
            let categoryDataset = undefined;
            if (categoryDatasetNode) {
                const seriesNodes = toArray(categoryDatasetNode.categorySeries);
                categoryDataset = {
                    series: seriesNodes.map((s: any) => ({
                        seriesExpression: parseExpression(s.seriesExpression),
                        categoryExpression: parseExpression(s.categoryExpression),
                        valueExpression: parseExpression(s.valueExpression),
                        labelExpression: parseExpression(s.labelExpression)
                    }))
                };
            }

            const pieDatasetNode = extractFirst(elem.pieDataset);
            let pieDataset = undefined;
            if (pieDatasetNode) {
                pieDataset = {
                    keyExpression: parseExpression(pieDatasetNode.keyExpression),
                    valueExpression: parseExpression(pieDatasetNode.valueExpression),
                    labelExpression: parseExpression(pieDatasetNode.labelExpression)
                };
            }

            elements.push({
                type: 'chart',
                chartType: tagName === 'chart' ? (chartElem['@_chartType'] || 'chart') : tagName,
                ...base,
                box: parseBox(chartElem.box || elem.box),
                chartTitle: chartTitleNode ? extractText(chartTitleNode.titleExpression) : undefined,
                chartSubtitle: chartSubtitleNode ? extractText(chartSubtitleNode.subtitleExpression) : undefined,
                legend: chartLegendNode ? {
                    textColor: chartLegendNode['@_textColor'] || undefined,
                    backgroundColor: chartLegendNode['@_backgroundColor'] || undefined
                } : undefined,
                categoryDataset,
                pieDataset
            });
        }
    }

    return elements;
}
