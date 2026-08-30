import {
    LayoutResult,
    LayoutPage,
    LayoutBand,
    LayoutElement,
    LayerType
} from '../layout/jrxmlLayoutModel';
import { renderChartSvg } from './charts/jrxmlChartRenderer';
import { resolveChartData } from './charts/jrxmlChartData';
import { createDefaultPreviewDataset } from '../expression/jrxmlEvaluationContext';
import { renderBarcodeSvg } from './barcodes/jrxmlBarcodeRenderer';

export function renderLayoutDocument(layout: LayoutResult): string {
    const pagesHtml = layout.pages.map(page => renderPage(page, layout.pageWidth, layout.pageHeight)).join('\n');
    return `<div class="pages-container" style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
        ${pagesHtml}
    </div>`;
}

export function renderPage(page: LayoutPage, pageWidth: number, pageHeight: number): string {
    const layerTypes: LayerType[] = ['BACKGROUND', 'CONTENT', 'FOOTER', 'OVERLAY'];
    const layerZIndexes: Record<LayerType, number> = {
        BACKGROUND: 1,
        CONTENT: 10,
        FOOTER: 20,
        OVERLAY: 30
    };

    const layersHtml = layerTypes.map(layer => {
        const bandsInLayer = page.bands.filter(b => b.layer === layer);
        if (bandsInLayer.length === 0) {
            return '';
        }

        const bandsHtml = bandsInLayer.map(b => renderBand(b)).join('\n');
        return `<div class="page-layer layer-${layer.toLowerCase()}" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; z-index: ${layerZIndexes[layer]};">
            ${bandsHtml}
        </div>`;
    }).filter(h => h.length > 0).join('\n');

    return `<div id="page-${page.pageNumber}" class="jrxml-page report-canvas" style="width: ${page.width}px; height: ${page.height}px; position: relative; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); overflow: hidden; transform-origin: top center;">
        ${layersHtml}
    </div>`;
}

function renderBand(band: LayoutBand): string {
    const elementsHtml = band.elements.map(el => renderElement(el)).join('\n');
    return `<div class="band band-${band.type}" style="position: absolute; left: ${band.bounds.x}px; top: ${band.bounds.y}px; width: ${band.bounds.width}px; height: ${band.bounds.height}px; pointer-events: auto;">
        ${elementsHtml}
    </div>`;
}

export function renderElement(el: LayoutElement): string {
    const source = el.sourceElement;
    const style = el.resolvedStyle || {};
    const geometry = el.localGeometry;

    const styles: string[] = [
        'position: absolute',
        `left: ${geometry.x}px`,
        `top: ${geometry.y}px`,
        `width: ${geometry.width}px`,
        `height: ${geometry.height}px`,
        'box-sizing: border-box'
    ];

    const forecolor = source.forecolor || style.forecolor;
    if (forecolor) {
        styles.push(`color: ${forecolor}`);
    }

    const mode = source.mode || style.mode;
    const backcolor = source.backcolor || style.backcolor;
    if (mode === 'Opaque' && backcolor) {
        styles.push(`background-color: ${backcolor}`);
    } else if (backcolor && el.type === 'rectangle' && mode !== 'Transparent') {
        styles.push(`background-color: ${backcolor}`);
    } else {
        styles.push('background-color: transparent');
    }

    const fontName = source.fontName || style.fontName;
    if (fontName) {
        styles.push(`font-family: ${fontName}, sans-serif`);
    }

    const fontSize = source.fontSize !== undefined ? source.fontSize : style.fontSize;
    if (fontSize !== undefined) {
        styles.push(`font-size: ${fontSize}px`);
    }

    const isBold = source.isBold !== undefined ? source.isBold : style.isBold;
    if (isBold) {
        styles.push('font-weight: bold');
    }

    const isItalic = source.isItalic !== undefined ? source.isItalic : style.isItalic;
    if (isItalic) {
        styles.push('font-style: italic');
    }

    const isUnderline = source.isUnderline !== undefined ? source.isUnderline : style.isUnderline;
    const isStrikeThrough = source.isStrikeThrough !== undefined ? source.isStrikeThrough : style.isStrikeThrough;
    if (isUnderline && isStrikeThrough) {
        styles.push('text-decoration: underline line-through');
    } else if (isUnderline) {
        styles.push('text-decoration: underline');
    } else if (isStrikeThrough) {
        styles.push('text-decoration: line-through');
    }

    const box = style.box || source.box;
    if (box) {
        if (box.topPadding !== undefined) {styles.push(`padding-top: ${box.topPadding}px`);}
        if (box.bottomPadding !== undefined) {styles.push(`padding-bottom: ${box.bottomPadding}px`);}
        if (box.leftPadding !== undefined) {styles.push(`padding-left: ${box.leftPadding}px`);}
        if (box.rightPadding !== undefined) {styles.push(`padding-right: ${box.rightPadding}px`);}

        if (box.pen?.lineWidth) {
            const penColor = box.pen.lineColor || forecolor || '#000000';
            const penStyle = mapLineStyle(box.pen.lineStyle);
            styles.push(`border: ${box.pen.lineWidth}px ${penStyle} ${penColor}`);
        } else {
            if (box.topPen?.lineWidth) {
                styles.push(`border-top: ${box.topPen.lineWidth}px ${mapLineStyle(box.topPen.lineStyle)} ${box.topPen.lineColor || forecolor || '#000000'}`);
            }
            if (box.bottomPen?.lineWidth) {
                styles.push(`border-bottom: ${box.bottomPen.lineWidth}px ${mapLineStyle(box.bottomPen.lineStyle)} ${box.bottomPen.lineColor || forecolor || '#000000'}`);
            }
            if (box.leftPen?.lineWidth) {
                styles.push(`border-left: ${box.leftPen.lineWidth}px ${mapLineStyle(box.leftPen.lineStyle)} ${box.leftPen.lineColor || forecolor || '#000000'}`);
            }
            if (box.rightPen?.lineWidth) {
                styles.push(`border-right: ${box.rightPen.lineWidth}px ${mapLineStyle(box.rightPen.lineStyle)} ${box.rightPen.lineColor || forecolor || '#000000'}`);
            }
        }
    }

    const hAlign = source.horizontalAlignment || style.horizontalAlignment || 'Left';
    const vAlign = source.verticalAlignment || style.verticalAlignment || 'Top';

    let justifyContent = 'flex-start';
    if (hAlign === 'Center' || hAlign === 'center') {
        justifyContent = 'center';
    } else if (hAlign === 'Right' || hAlign === 'right') {
        justifyContent = 'flex-end';
    } else if (hAlign === 'Justified' || hAlign === 'justified') {
        justifyContent = 'space-between';
    }

    let alignItems = 'flex-start';
    if (vAlign === 'Middle' || vAlign === 'middle' || vAlign === 'Center' || vAlign === 'center') {
        alignItems = 'center';
    } else if (vAlign === 'Bottom' || vAlign === 'bottom') {
        alignItems = 'flex-end';
    }

    let textAlign = 'left';
    if (hAlign === 'Center' || hAlign === 'center') {
        textAlign = 'center';
    } else if (hAlign === 'Right' || hAlign === 'right') {
        textAlign = 'right';
    } else if (hAlign === 'Justified' || hAlign === 'justified') {
        textAlign = 'justify';
    }

    const rotation = source.rotation || style.rotation;
    if (rotation === 'Left') {
        styles.push('writing-mode: vertical-rl; transform: rotate(180deg)');
    } else if (rotation === 'Right') {
        styles.push('writing-mode: vertical-rl');
    } else if (rotation === 'UpsideDown') {
        styles.push('transform: rotate(180deg)');
    }

    const contentStyle = `display: flex; width: 100%; height: 100%; justify-content: ${justifyContent}; align-items: ${alignItems}; text-align: ${textAlign}; overflow: hidden;`;

    const elementPayload = {
        id: el.id,
        type: el.type,
        chartType: el.chartType,
        x: geometry.x,
        y: geometry.y,
        absoluteX: el.absoluteGeometry.x,
        absoluteY: el.absoluteGeometry.y,
        width: geometry.width,
        height: geometry.height,
        text: source.text,
        expression: source.expression?.raw || source.subreportExpression?.raw || source.imageExpression?.raw || source.barcodeComponent?.codeExpression?.raw,
        displayValue: el.displayValue,
        pattern: source.pattern || style.pattern,
        fontName: fontName,
        fontSize: fontSize,
        isBold: isBold,
        isItalic: isItalic,
        isUnderline: isUnderline,
        isStrikeThrough: isStrikeThrough,
        forecolor: forecolor,
        backcolor: backcolor,
        mode: mode,
        bandType: el.bandId
    };

    const dataAttrs = `data-element-id="${el.id}" data-band="${el.bandId}" data-element='${JSON.stringify(elementPayload).replace(/'/g, '&apos;')}'`;

    switch (el.type) {
        case 'staticText': {
            const styleStr = styles.join('; ');
            const rawText = el.displayValue !== undefined ? el.displayValue : (source.text || '');
            const renderedContent = renderFormattedMarkup(rawText, source.markup);
            const cleanTitle = stripTags(rawText);
            return `<div id="${el.id}" class="element element-text clickable" style="${styleStr}" ${dataAttrs} title="Static Text: ${escapeHtml(cleanTitle)}">
                <div class="element-content" style="${contentStyle}">${renderedContent}</div>
            </div>`;
        }

        case 'textField': {
            const styleStr = styles.join('; ');
            const exprText = source.expression?.raw || '$F{field}';
            const rawText = el.displayValue !== undefined ? el.displayValue : exprText;
            const renderedContent = renderFormattedMarkup(rawText, source.markup);
            const cleanTitle = stripTags(rawText);
            return `<div id="${el.id}" class="element element-field clickable" style="${styleStr}" ${dataAttrs} title="Expression: ${escapeHtml(cleanTitle)}">
                <div class="element-content" style="${contentStyle}">${renderedContent}</div>
            </div>`;
        }

        case 'rectangle': {
            const radius = source.radius !== undefined ? source.radius : style.radius;
            if (radius) {
                styles.push(`border-radius: ${radius}px`);
            }
            const pen = source.pen || style.pen;
            if (pen?.lineWidth) {
                styles.push(`border: ${pen.lineWidth}px ${mapLineStyle(pen.lineStyle)} ${pen.lineColor || '#000000'}`);
            }
            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element element-rectangle clickable" style="${styleStr}" ${dataAttrs} title="Rectangle (${geometry.width}x${geometry.height})"></div>`;
        }

        case 'ellipse': {
            styles.push('border-radius: 50%');
            const pen = source.pen || style.pen;
            if (pen?.lineWidth) {
                styles.push(`border: ${pen.lineWidth}px ${mapLineStyle(pen.lineStyle)} ${pen.lineColor || '#000000'}`);
            } else {
                styles.push('border: 1px solid #3B82F6');
            }
            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element element-ellipse clickable" style="${styleStr}" ${dataAttrs} title="Ellipse (${geometry.width}x${geometry.height})"></div>`;
        }

        case 'line': {
            const pen = source.pen || style.pen;
            const width = pen?.lineWidth || 1;
            const color = pen?.lineColor || '#000000';
            const lineStyle = mapLineStyle(pen?.lineStyle);

            if (geometry.width >= geometry.height) {
                styles.push(`border-top: ${width}px ${lineStyle} ${color}`);
                styles.push('height: 0px');
            } else {
                styles.push(`border-left: ${width}px ${lineStyle} ${color}`);
                styles.push('width: 0px');
            }
            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element element-line clickable" style="${styleStr}" ${dataAttrs} title="Line (${geometry.width}x${geometry.height})"></div>`;
        }

        case 'frame': {
            styles.push('overflow: visible');
            const styleStr = styles.join('; ');
            const childrenHtml = (el.children || []).map(renderElement).join('\n');
            return `<div id="${el.id}" class="element element-frame clickable" style="${styleStr}" ${dataAttrs} title="Frame (${geometry.width}x${geometry.height})">
                ${childrenHtml}
            </div>`;
        }

        case 'elementGroup': {
            const styleStr = styles.join('; ');
            const childrenHtml = (el.children || []).map(renderElement).join('\n');
            return `<div id="${el.id}" class="element element-group" style="${styleStr}" ${dataAttrs}>
                ${childrenHtml}
            </div>`;
        }

        case 'image': {
            const styleStr = styles.join('; ');
            const exprText = source.imageExpression?.raw || 'Image';
            return `<div id="${el.id}" class="element element-image clickable" style="${styleStr}; border: 1px dashed #9C27B0; border-radius: 4px; background: rgba(156, 39, 176, 0.04);" ${dataAttrs} title="Image: ${escapeHtml(exprText)}">
                <div class="element-content" style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 10px; color: #7B1FA2; font-weight: 500;">
                    <span style="font-size: 14px; margin-right: 4px;">🖼️</span>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">${escapeHtml(exprText)}</span>
                </div>
            </div>`;
        }

        case 'componentElement': {
            if (source.componentType === 'barcode' && source.barcodeComponent) {
                const bc = source.barcodeComponent;
                const exprText = bc.codeExpression?.raw || 'Barcode';
                const evaluatedVal = el.displayValue !== undefined ? el.displayValue : exprText.replace(/^"|"$/g, '');
                const barcodeSvg = renderBarcodeSvg({
                    barcodeType: bc.barcodeType,
                    value: evaluatedVal,
                    width: geometry.width,
                    height: geometry.height,
                    drawText: bc.drawText,
                    errorCorrectionLevel: bc.errorCorrectionLevel,
                    barWidth: bc.barWidth,
                    barHeight: bc.barHeight
                });

                styles.push('overflow: hidden');
                const styleStr = styles.join('; ');
                return `<div id="${el.id}" class="element element-barcode clickable" style="${styleStr}" ${dataAttrs} title="${bc.barcodeType}: ${escapeHtml(evaluatedVal)}">
                    <div style="width: 100%; height: 100%; pointer-events: none;">
                        ${barcodeSvg}
                    </div>
                </div>`;
            }

            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element element-component clickable" style="${styleStr}" ${dataAttrs} title="Component">
                <div class="element-content">Component</div>
            </div>`;
        }

        case 'subreport': {
            const styleStr = styles.join('; ');
            const exprText = source.subreportExpression?.raw || 'Subreport';
            return `<div id="${el.id}" class="element element-subreport clickable" style="${styleStr}; border: 1px dashed #0284C7; border-radius: 4px; background: rgba(2, 132, 199, 0.04);" ${dataAttrs} title="Subreport: ${escapeHtml(exprText)}">
                <div class="element-content" style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 10px; color: #0369A1; font-weight: 500;">
                    <span style="font-size: 14px; margin-right: 4px;">📑</span>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">Subreport: ${escapeHtml(exprText)}</span>
                </div>
            </div>`;
        }

        case 'chart': {
            const chartData = el.resolvedChartData || resolveChartData(source, createDefaultPreviewDataset());
            styles.push('border: 1px solid #CBD5E1');
            styles.push('border-radius: 4px');
            styles.push('background: #FFFFFF');
            styles.push('box-shadow: 0 1px 3px rgba(0,0,0,0.06)');
            styles.push('overflow: hidden');

            const styleStr = styles.join('; ');
            const chartSvg = renderChartSvg(chartData, geometry.width, geometry.height, style);
            const title = chartData.title || el.chartType || 'Chart';

            return `<div id="${el.id}" class="element element-chart clickable" style="${styleStr}" ${dataAttrs} title="${escapeHtml(title)}">
                <div style="width: 100%; height: 100%; pointer-events: none;">
                    ${chartSvg}
                </div>
            </div>`;
        }

        default: {
            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element clickable" style="${styleStr}" ${dataAttrs}>
                <div class="element-content">${escapeHtml(el.type)}</div>
            </div>`;
        }
    }
}

function mapLineStyle(style?: string): string {
    if (!style) {return 'solid';}
    const s = style.toLowerCase();
    if (s === 'dashed') {return 'dashed';}
    if (s === 'dotted') {return 'dotted';}
    if (s === 'double') {return 'double';}
    return 'solid';
}

function stripTags(text: string): string {
    return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function renderFormattedMarkup(text: string, markupType?: string): string {
    if (!text) {return '';}

    let decoded = text;
    if (decoded.includes('&amp;') || decoded.includes('&lt;') || decoded.includes('&gt;') || decoded.includes('&quot;')) {
        decoded = decoded
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }

    const hasStyledTags = /<(style|b|i|u|font)(\s[^>]*)?>[\s\S]*?<\/\1>/i.test(decoded);
    if (!hasStyledTags && markupType !== 'styled' && markupType !== 'html') {
        return escapeHtml(decoded);
    }

    return parseStyledXmlToHtml(decoded);
}

function parseStyledXmlToHtml(input: string): string {
    let output = input;

    output = output.replace(/<style\s+([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, inner) => {
        const styleRules: string[] = [];
        const isBoldMatch = attrs.match(/isBold=["']true["']/i);
        if (isBoldMatch) {styleRules.push('font-weight: bold');}

        const isItalicMatch = attrs.match(/isItalic=["']true["']/i);
        if (isItalicMatch) {styleRules.push('font-style: italic');}

        const isUnderlineMatch = attrs.match(/isUnderline=["']true["']/i);
        if (isUnderlineMatch) {styleRules.push('text-decoration: underline');}

        const forecolorMatch = attrs.match(/forecolor=["']([^"']+)["']/i);
        if (forecolorMatch) {styleRules.push(`color: ${forecolorMatch[1]}`);}

        const backcolorMatch = attrs.match(/backcolor=["']([^"']+)["']/i);
        if (backcolorMatch) {styleRules.push(`background-color: ${backcolorMatch[1]}`);}

        const sizeMatch = attrs.match(/size=["']([^"']+)["']/i);
        if (sizeMatch) {styleRules.push(`font-size: ${sizeMatch[1]}px`);}

        const fontNameMatch = attrs.match(/(?:fontName|pdfFontName)=["']([^"']+)["']/i);
        if (fontNameMatch) {styleRules.push(`font-family: ${fontNameMatch[1]}, sans-serif`);}

        const safeInner = escapeHtml(inner);
        return `<span style="${styleRules.join('; ')}">${safeInner}</span>`;
    });

    output = output.replace(/<b>([\s\S]*?)<\/b>/gi, (_, inner) => `<strong>${escapeHtml(inner)}</strong>`);
    output = output.replace(/<i>([\s\S]*?)<\/i>/gi, (_, inner) => `<em>${escapeHtml(inner)}</em>`);
    output = output.replace(/<u>([\s\S]*?)<\/u>/gi, (_, inner) => `<span style="text-decoration: underline;">${escapeHtml(inner)}</span>`);

    return output;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
