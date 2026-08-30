import {
    LayoutResult,
    LayoutPage,
    LayoutBand,
    LayoutElement,
    LayerType
} from '../layout/jrxmlLayoutModel';

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
        <div class="band-label">${band.type.toUpperCase()}</div>
        ${elementsHtml}
    </div>`;
}

export function renderElement(el: LayoutElement): string {
    const source = el.sourceElement;
    const geometry = el.localGeometry;
    const styles: string[] = [
        'position: absolute',
        `left: ${geometry.x}px`,
        `top: ${geometry.y}px`,
        `width: ${geometry.width}px`,
        `height: ${geometry.height}px`
    ];

    if (source.forecolor) {
        styles.push(`color: ${source.forecolor}`);
    }

    if (source.mode === 'Opaque' && source.backcolor) {
        styles.push(`background-color: ${source.backcolor}`);
    } else if (source.backcolor && el.type === 'rectangle') {
        styles.push(`background-color: ${source.backcolor}`);
    }

    if (source.fontName) {
        styles.push(`font-family: ${source.fontName}, sans-serif`);
    }
    if (source.fontSize) {
        styles.push(`font-size: ${source.fontSize}px`);
    }
    if (source.isBold) {
        styles.push('font-weight: bold');
    }
    if (source.isItalic) {
        styles.push('font-style: italic');
    }
    if (source.isUnderline && source.isStrikeThrough) {
        styles.push('text-decoration: underline line-through');
    } else if (source.isUnderline) {
        styles.push('text-decoration: underline');
    } else if (source.isStrikeThrough) {
        styles.push('text-decoration: line-through');
    }

    if (source.horizontalAlignment) {
        const alignMap: Record<string, string> = {
            Left: 'left',
            Center: 'center',
            Right: 'right',
            Justified: 'justify'
        };
        const textAlign = alignMap[source.horizontalAlignment] || source.horizontalAlignment.toLowerCase();
        styles.push(`text-align: ${textAlign}`);
    }

    if (source.box) {
        const box = source.box;
        if (box.topPen?.lineWidth) {
            styles.push(`border-top: ${box.topPen.lineWidth}px ${box.topPen.lineStyle || 'solid'} ${box.topPen.lineColor || '#000000'}`);
        }
        if (box.bottomPen?.lineWidth) {
            styles.push(`border-bottom: ${box.bottomPen.lineWidth}px ${box.bottomPen.lineStyle || 'solid'} ${box.bottomPen.lineColor || '#000000'}`);
        }
        if (box.leftPen?.lineWidth) {
            styles.push(`border-left: ${box.leftPen.lineWidth}px ${box.leftPen.lineStyle || 'solid'} ${box.leftPen.lineColor || '#000000'}`);
        }
        if (box.rightPen?.lineWidth) {
            styles.push(`border-right: ${box.rightPen.lineWidth}px ${box.rightPen.lineStyle || 'solid'} ${box.rightPen.lineColor || '#000000'}`);
        }
        if (box.pen?.lineWidth) {
            styles.push(`border: ${box.pen.lineWidth}px ${box.pen.lineStyle || 'solid'} ${box.pen.lineColor || '#000000'}`);
        }
        if (box.topPadding || box.bottomPadding || box.leftPadding || box.rightPadding) {
            styles.push(`padding: ${box.topPadding || 0}px ${box.rightPadding || 0}px ${box.bottomPadding || 0}px ${box.leftPadding || 0}px`);
        }
    }

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
        expression: source.expression?.raw || source.subreportExpression?.raw || source.imageExpression?.raw,
        pattern: source.pattern,
        fontName: source.fontName,
        fontSize: source.fontSize,
        isBold: source.isBold,
        forecolor: source.forecolor,
        backcolor: source.backcolor,
        mode: source.mode,
        bandType: el.bandId
    };

    const dataAttrs = `data-element-id="${el.id}" data-band="${el.bandId}" data-element='${JSON.stringify(elementPayload).replace(/'/g, '&apos;')}'`;

    switch (el.type) {
        case 'staticText': {
            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element element-text clickable" style="${styleStr}" ${dataAttrs} title="Static Text: ${escapeHtml(source.text || '')}">
                <div class="element-content">${escapeHtml(source.text || '')}</div>
            </div>`;
        }

        case 'textField': {
            const styleStr = styles.join('; ');
            const exprText = source.expression?.raw || '$F{field}';
            return `<div id="${el.id}" class="element element-field clickable" style="${styleStr}" ${dataAttrs} title="TextField: ${escapeHtml(exprText)}">
                <div class="element-content">${escapeHtml(exprText)}</div>
            </div>`;
        }

        case 'rectangle': {
            if (source.radius) {
                styles.push(`border-radius: ${source.radius}px`);
            }
            if (source.pen?.lineWidth) {
                styles.push(`border: ${source.pen.lineWidth}px ${source.pen.lineStyle || 'solid'} ${source.pen.lineColor || '#000000'}`);
            }
            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element element-rectangle clickable" style="${styleStr}" ${dataAttrs} title="Rectangle (${geometry.width}x${geometry.height})"></div>`;
        }

        case 'ellipse': {
            styles.push('border-radius: 50%');
            if (source.pen?.lineWidth) {
                styles.push(`border: ${source.pen.lineWidth}px ${source.pen.lineStyle || 'solid'} ${source.pen.lineColor || '#000000'}`);
            } else {
                styles.push('border: 1px solid #3B82F6');
            }
            const styleStr = styles.join('; ');
            return `<div id="${el.id}" class="element element-ellipse clickable" style="${styleStr}" ${dataAttrs} title="Ellipse (${geometry.width}x${geometry.height})"></div>`;
        }

        case 'line': {
            const pen = source.pen;
            const width = pen?.lineWidth || 1;
            const color = pen?.lineColor || '#000000';
            const lineStyle = pen?.lineStyle || 'solid';

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
            return `<div id="${el.id}" class="element element-image clickable" style="${styleStr}" ${dataAttrs} title="Image: ${escapeHtml(exprText)}">
                <div class="element-content" style="display: flex; align-items: center; justify-content: center; height: 100%; background-color: rgba(156, 39, 176, 0.05);">🖼️ ${escapeHtml(exprText)}</div>
            </div>`;
        }

        case 'subreport': {
            const styleStr = styles.join('; ');
            const exprText = source.subreportExpression?.raw || 'Subreport';
            return `<div id="${el.id}" class="element element-subreport clickable" style="${styleStr}" ${dataAttrs} title="Subreport: ${escapeHtml(exprText)}">
                <div class="element-content" style="display: flex; align-items: center; justify-content: center; height: 100%; background-color: rgba(0, 122, 204, 0.05); font-weight: 600;">📊 Subreport: ${escapeHtml(exprText)}</div>
            </div>`;
        }

        case 'chart': {
            const styleStr = styles.join('; ');
            const chartType = el.chartType || 'chart';
            let chartIcon = '📈';
            let chartTypeName = 'Chart';

            if (chartType === 'barChart') {
                chartIcon = '📊';
                chartTypeName = 'Bar Chart';
            } else if (chartType === 'pieChart') {
                chartIcon = '🥧';
                chartTypeName = 'Pie Chart';
            } else if (chartType === 'lineChart') {
                chartIcon = '📈';
                chartTypeName = 'Line Chart';
            }

            const title = source.chartTitle ? ` - ${source.chartTitle}` : '';
            return `<div id="${el.id}" class="element element-chart clickable" style="${styleStr}" ${dataAttrs} title="${chartTypeName}${escapeHtml(title)}">
                <div class="element-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background-color: rgba(37, 99, 235, 0.05); border: 1px dashed #2563EB;">
                    <div style="font-size: 14px;">${chartIcon} <strong>${chartTypeName}</strong></div>
                    ${source.chartTitle ? `<div style="font-size: 10px; color: #64748B; margin-top: 4px;">${escapeHtml(source.chartTitle)}</div>` : ''}
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

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
