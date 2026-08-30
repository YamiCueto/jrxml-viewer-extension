import {
    JrxmlDocument,
    JrxmlReport,
    JrxmlStyle,
    JrxmlConditionalStyle,
    JrxmlParameter,
    JrxmlField,
    JrxmlVariable,
    JrxmlGroup,
    JrxmlBand,
    JrxmlElement,
    JrxmlBox,
    JrxmlPen,
    JrxmlExpression
} from '../model/jrxmlDocumentModel';

export function serializeJrxmlDocument(doc: JrxmlDocument): string {
    const report = doc.report;
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');

    const reportAttrs: string[] = [
        'xmlns="http://jasperreports.sourceforge.net/jasperreports"',
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        'xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"',
        `name="${escapeXmlAttr(report.name)}"`
    ];

    if (report.language) {reportAttrs.push(`language="${escapeXmlAttr(report.language)}"`);}
    reportAttrs.push(`pageWidth="${report.pageWidth}"`);
    reportAttrs.push(`pageHeight="${report.pageHeight}"`);
    reportAttrs.push(`orientation="${report.orientation}"`);
    reportAttrs.push(`columnWidth="${report.columnWidth}"`);
    reportAttrs.push(`columnSpacing="${report.columnSpacing}"`);
    reportAttrs.push(`leftMargin="${report.leftMargin}"`);
    reportAttrs.push(`rightMargin="${report.rightMargin}"`);
    reportAttrs.push(`topMargin="${report.topMargin}"`);
    reportAttrs.push(`bottomMargin="${report.bottomMargin}"`);
    if (report.uuid) {reportAttrs.push(`uuid="${escapeXmlAttr(report.uuid)}"`);}
    if (report.whenNoDataType) {reportAttrs.push(`whenNoDataType="${escapeXmlAttr(report.whenNoDataType)}"`);}

    lines.push(`<jasperReport ${reportAttrs.join(' ')}>`);

    if (report.properties) {
        for (const [name, val] of Object.entries(report.properties)) {
            lines.push(`    <property name="${escapeXmlAttr(name)}" value="${escapeXmlAttr(val)}"/>`);
        }
    }

    for (const style of report.styles) {
        lines.push(serializeStyle(style, '    '));
    }

    for (const param of report.parameters) {
        lines.push(serializeParameter(param, '    '));
    }

    if (report.queryString !== undefined) {
        lines.push(`    <queryString><![CDATA[${report.queryString}]]></queryString>`);
    }

    for (const field of report.fields) {
        lines.push(`    <field name="${escapeXmlAttr(field.name)}" class="${escapeXmlAttr(field.class)}"/>`);
    }

    for (const variable of report.variables) {
        lines.push(serializeVariable(variable, '    '));
    }

    for (const group of report.groups) {
        lines.push(serializeGroup(group, '    '));
    }

    const standardBandTypes = [
        'background',
        'title',
        'pageHeader',
        'columnHeader',
        'detail',
        'columnFooter',
        'pageFooter',
        'summary',
        'noData'
    ];

    for (const bType of standardBandTypes) {
        const matchingBands = report.bands.filter(b => b.type === bType);
        for (const band of matchingBands) {
            lines.push(`    <${bType}>`);
            const splitAttr = band.splitType ? ` splitType="${escapeXmlAttr(band.splitType)}"` : '';
            lines.push(`        <band height="${band.height}"${splitAttr}>`);
            for (const el of band.elements) {
                lines.push(serializeElement(el, '            '));
            }
            lines.push('        </band>');
            lines.push(`    </${bType}>`);
        }
    }

    lines.push('</jasperReport>');
    lines.push('');

    return lines.join('\n');
}

function escapeXmlAttr(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function serializePen(pen: JrxmlPen, tagName: string, indent: string): string {
    const attrs: string[] = [];
    if (pen.lineWidth !== undefined) {attrs.push(`lineWidth="${pen.lineWidth}"`);}
    if (pen.lineColor) {attrs.push(`lineColor="${escapeXmlAttr(pen.lineColor)}"`);}
    if (pen.lineStyle) {attrs.push(`lineStyle="${escapeXmlAttr(pen.lineStyle)}"`);}
    return `${indent}<${tagName} ${attrs.join(' ')}/>`;
}

function serializeBox(box: JrxmlBox, indent: string): string {
    const boxAttrs: string[] = [];
    if (box.topPadding !== undefined) {boxAttrs.push(`topPadding="${box.topPadding}"`);}
    if (box.leftPadding !== undefined) {boxAttrs.push(`leftPadding="${box.leftPadding}"`);}
    if (box.bottomPadding !== undefined) {boxAttrs.push(`bottomPadding="${box.bottomPadding}"`);}
    if (box.rightPadding !== undefined) {boxAttrs.push(`rightPadding="${box.rightPadding}"`);}

    const children: string[] = [];
    if (box.pen) {children.push(serializePen(box.pen, 'pen', indent + '    '));}
    if (box.topPen) {children.push(serializePen(box.topPen, 'topPen', indent + '    '));}
    if (box.leftPen) {children.push(serializePen(box.leftPen, 'leftPen', indent + '    '));}
    if (box.bottomPen) {children.push(serializePen(box.bottomPen, 'bottomPen', indent + '    '));}
    if (box.rightPen) {children.push(serializePen(box.rightPen, 'rightPen', indent + '    '));}

    const attrStr = boxAttrs.length > 0 ? ` ${boxAttrs.join(' ')}` : '';
    if (children.length === 0) {
        return `${indent}<box${attrStr}/>`;
    }
    return `${indent}<box${attrStr}>\n${children.join('\n')}\n${indent}</box>`;
}

function serializeConditionalStyle(cs: JrxmlConditionalStyle, indent: string): string {
    const s = cs.style;
    const attrs: string[] = [];
    if (s.fontName) {attrs.push(`fontName="${escapeXmlAttr(s.fontName)}"`);}
    if (s.fontSize !== undefined) {attrs.push(`fontSize="${s.fontSize}"`);}
    if (s.isBold) {attrs.push('isBold="true"');}
    if (s.isItalic) {attrs.push('isItalic="true"');}
    if (s.isUnderline) {attrs.push('isUnderline="true"');}
    if (s.isStrikeThrough) {attrs.push('isStrikeThrough="true"');}
    if (s.forecolor) {attrs.push(`forecolor="${escapeXmlAttr(s.forecolor)}"`);}
    if (s.backcolor) {attrs.push(`backcolor="${escapeXmlAttr(s.backcolor)}"`);}
    if (s.mode) {attrs.push(`mode="${escapeXmlAttr(s.mode)}"`);}
    if (s.horizontalAlignment) {attrs.push(`hTextAlign="${escapeXmlAttr(s.horizontalAlignment)}"`);}
    if (s.verticalAlignment) {attrs.push(`vTextAlign="${escapeXmlAttr(s.verticalAlignment)}"`);}
    if (s.pattern) {attrs.push(`pattern="${escapeXmlAttr(s.pattern)}"`);}

    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    const lines: string[] = [];
    lines.push(`${indent}<conditionalStyle${attrStr}>`);
    lines.push(`${indent}    <conditionExpression><![CDATA[${cs.conditionExpression.raw}]]></conditionExpression>`);
    if (s.box) {
        lines.push(serializeBox(s.box, indent + '    '));
    }
    lines.push(`${indent}</conditionalStyle>`);
    return lines.join('\n');
}

function serializeStyle(style: JrxmlStyle, indent: string): string {
    const attrs: string[] = [`name="${escapeXmlAttr(style.name)}"`];
    if (style.isDefault) {attrs.push('isDefault="true"');}
    if (style.parentStyle) {attrs.push(`style="${escapeXmlAttr(style.parentStyle)}"`);}
    if (style.fontName) {attrs.push(`fontName="${escapeXmlAttr(style.fontName)}"`);}
    if (style.fontSize !== undefined) {attrs.push(`fontSize="${style.fontSize}"`);}
    if (style.isBold) {attrs.push('isBold="true"');}
    if (style.isItalic) {attrs.push('isItalic="true"');}
    if (style.isUnderline) {attrs.push('isUnderline="true"');}
    if (style.isStrikeThrough) {attrs.push('isStrikeThrough="true"');}
    if (style.forecolor) {attrs.push(`forecolor="${escapeXmlAttr(style.forecolor)}"`);}
    if (style.backcolor) {attrs.push(`backcolor="${escapeXmlAttr(style.backcolor)}"`);}
    if (style.mode) {attrs.push(`mode="${escapeXmlAttr(style.mode)}"`);}
    if (style.horizontalAlignment) {attrs.push(`hTextAlign="${escapeXmlAttr(style.horizontalAlignment)}"`);}
    if (style.verticalAlignment) {attrs.push(`vTextAlign="${escapeXmlAttr(style.verticalAlignment)}"`);}
    if (style.pattern) {attrs.push(`pattern="${escapeXmlAttr(style.pattern)}"`);}

    const children: string[] = [];
    if (style.box) {
        children.push(serializeBox(style.box, indent + '    '));
    }
    if (style.conditionalStyles) {
        for (const cs of style.conditionalStyles) {
            children.push(serializeConditionalStyle(cs, indent + '    '));
        }
    }

    if (children.length > 0) {
        return `${indent}<style ${attrs.join(' ')}>\n${children.join('\n')}\n${indent}</style>`;
    }
    return `${indent}<style ${attrs.join(' ')}/>`;
}

function serializeParameter(param: JrxmlParameter, indent: string): string {
    const attrs: string[] = [
        `name="${escapeXmlAttr(param.name)}"`,
        `class="${escapeXmlAttr(param.class)}"`
    ];
    if (param.isForPrompting === false) {
        attrs.push('isForPrompting="false"');
    }

    if (param.defaultValueExpression) {
        return `${indent}<parameter ${attrs.join(' ')}>\n${indent}    <defaultValueExpression><![CDATA[${param.defaultValueExpression.raw}]]></defaultValueExpression>\n${indent}</parameter>`;
    }
    return `${indent}<parameter ${attrs.join(' ')}/>`;
}

function serializeVariable(v: JrxmlVariable, indent: string): string {
    const attrs: string[] = [
        `name="${escapeXmlAttr(v.name)}"`,
        `class="${escapeXmlAttr(v.class)}"`
    ];
    if (v.calculation && v.calculation !== 'Nothing') {
        attrs.push(`calculation="${escapeXmlAttr(v.calculation)}"`);
    }
    if (v.resetType) {attrs.push(`resetType="${escapeXmlAttr(v.resetType)}"`);}
    if (v.resetGroup) {attrs.push(`resetGroup="${escapeXmlAttr(v.resetGroup)}"`);}

    if (v.expression) {
        return `${indent}<variable ${attrs.join(' ')}>\n${indent}    <variableExpression><![CDATA[${v.expression.raw}]]></variableExpression>\n${indent}</variable>`;
    }
    return `${indent}<variable ${attrs.join(' ')}/>`;
}

function serializeGroup(g: JrxmlGroup, indent: string): string {
    const attrs: string[] = [`name="${escapeXmlAttr(g.name)}"`];
    if (g.isStartNewPage) {attrs.push('isStartNewPage="true"');}
    if (g.isReprintHeaderOnEachPage) {attrs.push('isReprintHeaderOnEachPage="true"');}

    const lines: string[] = [`${indent}<group ${attrs.join(' ')}>`];
    lines.push(`${indent}    <groupExpression><![CDATA[${g.expression.raw}]]></groupExpression>`);

    if (g.groupHeader) {
        const splitAttr = g.groupHeader.splitType ? ` splitType="${escapeXmlAttr(g.groupHeader.splitType)}"` : '';
        lines.push(`${indent}    <groupHeader>`);
        lines.push(`${indent}        <band height="${g.groupHeader.height}"${splitAttr}>`);
        for (const el of g.groupHeader.elements) {
            lines.push(serializeElement(el, indent + '            '));
        }
        lines.push(`${indent}        </band>`);
        lines.push(`${indent}    </groupHeader>`);
    }

    if (g.groupFooter) {
        const splitAttr = g.groupFooter.splitType ? ` splitType="${escapeXmlAttr(g.groupFooter.splitType)}"` : '';
        lines.push(`${indent}    <groupFooter>`);
        lines.push(`${indent}        <band height="${g.groupFooter.height}"${splitAttr}>`);
        for (const el of g.groupFooter.elements) {
            lines.push(serializeElement(el, indent + '            '));
        }
        lines.push(`${indent}        </band>`);
        lines.push(`${indent}    </groupFooter>`);
    }

    lines.push(`${indent}</group>`);
    return lines.join('\n');
}

function serializeReportElement(el: JrxmlElement, indent: string): string {
    const attrs: string[] = [];
    if (el.uuid) {attrs.push(`uuid="${escapeXmlAttr(el.uuid)}"`);}
    attrs.push(`x="${el.geometry.x}"`);
    attrs.push(`y="${el.geometry.y}"`);
    attrs.push(`width="${el.geometry.width}"`);
    attrs.push(`height="${el.geometry.height}"`);

    if (el.geometry.positionType) {attrs.push(`positionType="${escapeXmlAttr(el.geometry.positionType)}"`);}
    if (el.geometry.stretchType) {attrs.push(`stretchType="${escapeXmlAttr(el.geometry.stretchType)}"`);}
    if (el.styleName) {attrs.push(`style="${escapeXmlAttr(el.styleName)}"`);}
    if (el.mode) {attrs.push(`mode="${escapeXmlAttr(el.mode)}"`);}
    if (el.forecolor) {attrs.push(`forecolor="${escapeXmlAttr(el.forecolor)}"`);}
    if (el.backcolor) {attrs.push(`backcolor="${escapeXmlAttr(el.backcolor)}"`);}

    if (el.printWhenExpression) {
        return `${indent}<reportElement ${attrs.join(' ')}>\n${indent}    <printWhenExpression><![CDATA[${el.printWhenExpression.raw}]]></printWhenExpression>\n${indent}</reportElement>`;
    }
    return `${indent}<reportElement ${attrs.join(' ')}/>`;
}

function serializeTextElement(el: JrxmlElement, indent: string): string {
    const teAttrs: string[] = [];
    if (el.horizontalAlignment) {teAttrs.push(`textAlignment="${escapeXmlAttr(el.horizontalAlignment)}"`);}
    if (el.verticalAlignment) {teAttrs.push(`verticalAlignment="${escapeXmlAttr(el.verticalAlignment)}"`);}
    if (el.rotation) {teAttrs.push(`rotation="${escapeXmlAttr(el.rotation)}"`);}
    if (el.markup) {teAttrs.push(`markup="${escapeXmlAttr(el.markup)}"`);}

    const fontAttrs: string[] = [];
    if (el.fontName) {fontAttrs.push(`fontName="${escapeXmlAttr(el.fontName)}"`);}
    if (el.fontSize !== undefined) {fontAttrs.push(`size="${el.fontSize}"`);}
    if (el.isBold) {fontAttrs.push('isBold="true"');}
    if (el.isItalic) {fontAttrs.push('isItalic="true"');}
    if (el.isUnderline) {fontAttrs.push('isUnderline="true"');}
    if (el.isStrikeThrough) {fontAttrs.push('isStrikeThrough="true"');}

    const teAttrStr = teAttrs.length > 0 ? ` ${teAttrs.join(' ')}` : '';
    if (fontAttrs.length === 0) {
        return `${indent}<textElement${teAttrStr}/>`;
    }
    return `${indent}<textElement${teAttrStr}>\n${indent}    <font ${fontAttrs.join(' ')}/>\n${indent}</textElement>`;
}

export function serializeElement(el: JrxmlElement, indent: string): string {
    switch (el.type) {
        case 'staticText': {
            const lines: string[] = [`${indent}<staticText>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.box) {lines.push(serializeBox(el.box, indent + '    '));}
            lines.push(serializeTextElement(el, indent + '    '));
            lines.push(`${indent}    <text><![CDATA[${el.text || ''}]]></text>`);
            lines.push(`${indent}</staticText>`);
            return lines.join('\n');
        }

        case 'textField': {
            const tfAttrs: string[] = [];
            if (el.pattern) {tfAttrs.push(`pattern="${escapeXmlAttr(el.pattern)}"`);}
            if (el.isBlankWhenNull) {tfAttrs.push('isBlankWhenNull="true"');}
            if (el.evaluationTime) {tfAttrs.push(`evaluationTime="${escapeXmlAttr(el.evaluationTime)}"`);}
            if (el.evaluationGroup) {tfAttrs.push(`evaluationGroup="${escapeXmlAttr(el.evaluationGroup)}"`);}
            if (el.isStretchWithOverflow) {tfAttrs.push('isStretchWithOverflow="true"');}

            const tfAttrStr = tfAttrs.length > 0 ? ` ${tfAttrs.join(' ')}` : '';
            const lines: string[] = [`${indent}<textField${tfAttrStr}>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.box) {lines.push(serializeBox(el.box, indent + '    '));}
            lines.push(serializeTextElement(el, indent + '    '));
            lines.push(`${indent}    <textFieldExpression><![CDATA[${el.expression?.raw || ''}]]></textFieldExpression>`);
            lines.push(`${indent}</textField>`);
            return lines.join('\n');
        }

        case 'rectangle': {
            const rectAttrs: string[] = [];
            if (el.radius !== undefined) {rectAttrs.push(`radius="${el.radius}"`);}
            const rectAttrStr = rectAttrs.length > 0 ? ` ${rectAttrs.join(' ')}` : '';

            const lines: string[] = [`${indent}<rectangle${rectAttrStr}>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.pen) {
                lines.push(`${indent}    <graphicElement>\n${serializePen(el.pen, 'pen', indent + '        ')}\n${indent}    </graphicElement>`);
            }
            if (el.box) {lines.push(serializeBox(el.box, indent + '    '));}
            lines.push(`${indent}</rectangle>`);
            return lines.join('\n');
        }

        case 'ellipse': {
            const lines: string[] = [`${indent}<ellipse>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.pen) {
                lines.push(`${indent}    <graphicElement>\n${serializePen(el.pen, 'pen', indent + '        ')}\n${indent}    </graphicElement>`);
            }
            lines.push(`${indent}</ellipse>`);
            return lines.join('\n');
        }

        case 'line': {
            const lineAttrs: string[] = [];
            if (el.direction) {lineAttrs.push(`direction="${escapeXmlAttr(el.direction)}"`);}
            const lineAttrStr = lineAttrs.length > 0 ? ` ${lineAttrs.join(' ')}` : '';

            const lines: string[] = [`${indent}<line${lineAttrStr}>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.pen) {
                lines.push(`${indent}    <graphicElement>\n${serializePen(el.pen, 'pen', indent + '        ')}\n${indent}    </graphicElement>`);
            }
            lines.push(`${indent}</line>`);
            return lines.join('\n');
        }

        case 'image': {
            const imgAttrs: string[] = [];
            if (el.scaleImage) {imgAttrs.push(`scaleImage="${escapeXmlAttr(el.scaleImage)}"`);}
            const imgAttrStr = imgAttrs.length > 0 ? ` ${imgAttrs.join(' ')}` : '';

            const lines: string[] = [`${indent}<image${imgAttrStr}>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.box) {lines.push(serializeBox(el.box, indent + '    '));}
            lines.push(`${indent}    <imageExpression><![CDATA[${el.imageExpression?.raw || ''}]]></imageExpression>`);
            lines.push(`${indent}</image>`);
            return lines.join('\n');
        }

        case 'frame': {
            const lines: string[] = [`${indent}<frame>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.box) {lines.push(serializeBox(el.box, indent + '    '));}
            if (el.children) {
                for (const child of el.children) {
                    lines.push(serializeElement(child, indent + '    '));
                }
            }
            lines.push(`${indent}</frame>`);
            return lines.join('\n');
        }

        case 'elementGroup': {
            const lines: string[] = [`${indent}<elementGroup>`];
            if (el.children) {
                for (const child of el.children) {
                    lines.push(serializeElement(child, indent + '    '));
                }
            }
            lines.push(`${indent}</elementGroup>`);
            return lines.join('\n');
        }

        case 'componentElement': {
            const lines: string[] = [`${indent}<componentElement>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.box) {lines.push(serializeBox(el.box, indent + '    '));}

            if (el.barcodeComponent) {
                const bc = el.barcodeComponent;
                const bcAttrs: string[] = [
                    'xmlns:jr="http://jasperreports.sourceforge.net/jasperreports/components"',
                    'xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports/components http://jasperreports.sourceforge.net/xsd/components.xsd"'
                ];
                if (bc.evaluationTime) {bcAttrs.push(`evaluationTime="${escapeXmlAttr(bc.evaluationTime)}"`);}
                if (bc.drawText !== undefined) {bcAttrs.push(`drawText="${bc.drawText}"`);}
                if (bc.checksumRequired) {bcAttrs.push('checksumRequired="true"');}
                if (bc.errorCorrectionLevel) {bcAttrs.push(`errorCorrectionLevel="${escapeXmlAttr(bc.errorCorrectionLevel)}"`);}
                if (bc.barWidth !== undefined) {bcAttrs.push(`barWidth="${bc.barWidth}"`);}
                if (bc.barHeight !== undefined) {bcAttrs.push(`barHeight="${bc.barHeight}"`);}
                if (bc.quietZone !== undefined) {bcAttrs.push(`quietZone="${bc.quietZone}"`);}
                if (bc.orientation) {bcAttrs.push(`orientation="${escapeXmlAttr(bc.orientation)}"`);}

                const tagName = bc.barcodeType === 'QRCode' ? 'jr:QRCode' :
                    bc.barcodeType === 'Code128' ? 'jr:Code128' :
                    bc.barcodeType === 'EAN13' ? 'jr:EAN13' :
                    bc.barcodeType === 'Code39' ? 'jr:Code39' :
                    'jr:QRCode';

                const exprVal = bc.codeExpression?.raw || '';
                lines.push(`${indent}    <${tagName} ${bcAttrs.join(' ')}>`);
                lines.push(`${indent}        <jr:codeExpression><![CDATA[${exprVal}]]></jr:codeExpression>`);
                lines.push(`${indent}    </${tagName}>`);
            }

            lines.push(`${indent}</componentElement>`);
            return lines.join('\n');
        }

        case 'subreport': {
            const lines: string[] = [`${indent}<subreport>`];
            lines.push(serializeReportElement(el, indent + '    '));
            if (el.parameters) {
                for (const p of el.parameters) {
                    lines.push(`${indent}    <subreportParameter name="${escapeXmlAttr(p.name)}">`);
                    lines.push(`${indent}        <subreportParameterExpression><![CDATA[${p.expression?.raw || ''}]]></subreportParameterExpression>`);
                    lines.push(`${indent}    </subreportParameter>`);
                }
            }
            if (el.connectionExpression) {
                lines.push(`${indent}    <connectionExpression><![CDATA[${el.connectionExpression.raw}]]></connectionExpression>`);
            }
            if (el.dataSourceExpression) {
                lines.push(`${indent}    <dataSourceExpression><![CDATA[${el.dataSourceExpression.raw}]]></dataSourceExpression>`);
            }
            if (el.subreportExpression) {
                lines.push(`${indent}    <subreportExpression><![CDATA[${el.subreportExpression.raw}]]></subreportExpression>`);
            }
            lines.push(`${indent}</subreport>`);
            return lines.join('\n');
        }

        case 'chart': {
            const tagName = el.chartType || 'barChart';
            const lines: string[] = [`${indent}<${tagName}>`];
            lines.push(`${indent}    <chart>`);
            lines.push(serializeReportElement(el, indent + '        '));
            if (el.chartTitle) {
                lines.push(`${indent}        <chartTitle><titleExpression><![CDATA["${el.chartTitle}"]]></titleExpression></chartTitle>`);
            }
            if (el.chartSubtitle) {
                lines.push(`${indent}        <chartSubtitle><subtitleExpression><![CDATA["${el.chartSubtitle}"]]></subtitleExpression></chartSubtitle>`);
            }
            if (el.legend) {
                const legAttrs: string[] = [];
                if (el.legend.textColor) {legAttrs.push(`textColor="${escapeXmlAttr(el.legend.textColor)}"`);}
                if (el.legend.backgroundColor) {legAttrs.push(`backgroundColor="${escapeXmlAttr(el.legend.backgroundColor)}"`);}
                lines.push(`${indent}        <chartLegend ${legAttrs.join(' ')}/>`);
            }
            lines.push(`${indent}    </chart>`);
            if (el.categoryDataset) {
                lines.push(`${indent}    <categoryDataset>`);
                for (const s of el.categoryDataset.series) {
                    lines.push(`${indent}        <categorySeries>`);
                    if (s.seriesExpression) {lines.push(`${indent}            <seriesExpression><![CDATA[${s.seriesExpression.raw}]]></seriesExpression>`);}
                    if (s.categoryExpression) {lines.push(`${indent}            <categoryExpression><![CDATA[${s.categoryExpression.raw}]]></categoryExpression>`);}
                    if (s.valueExpression) {lines.push(`${indent}            <valueExpression><![CDATA[${s.valueExpression.raw}]]></valueExpression>`);}
                    if (s.labelExpression) {lines.push(`${indent}            <labelExpression><![CDATA[${s.labelExpression.raw}]]></labelExpression>`);}
                    lines.push(`${indent}        </categorySeries>`);
                }
                lines.push(`${indent}    </categoryDataset>`);
            }
            if (el.pieDataset) {
                lines.push(`${indent}    <pieDataset>`);
                if (el.pieDataset.keyExpression) {lines.push(`${indent}        <keyExpression><![CDATA[${el.pieDataset.keyExpression.raw}]]></keyExpression>`);}
                if (el.pieDataset.valueExpression) {lines.push(`${indent}        <valueExpression><![CDATA[${el.pieDataset.valueExpression.raw}]]></valueExpression>`);}
                if (el.pieDataset.labelExpression) {lines.push(`${indent}        <labelExpression><![CDATA[${el.pieDataset.labelExpression.raw}]]></labelExpression>`);}
                lines.push(`${indent}    </pieDataset>`);
            }
            lines.push(`${indent}</${tagName}>`);
            return lines.join('\n');
        }

        default:
            return '';
    }
}
