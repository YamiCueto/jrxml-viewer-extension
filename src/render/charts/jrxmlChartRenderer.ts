import { ResolvedChartData, ChartSeries, ChartPieSlice } from './jrxmlChartModel';
import { ResolvedStyle } from '../../style/jrxmlResolvedStyle';

export function renderChartSvg(
    data: ResolvedChartData,
    width: number,
    height: number,
    style?: ResolvedStyle
): string {
    const safeW = Math.max(width, 100);
    const safeH = Math.max(height, 60);

    const fontFam = style?.fontName ? `${style.fontName}, sans-serif` : 'SansSerif, sans-serif';
    const chartType = data.chartType;

    let titleH = 0;
    if (data.title && data.subtitle) {
        titleH = 26;
    } else if (data.title || data.subtitle) {
        titleH = 18;
    }

    let headerSvg = '';
    if (data.title) {
        headerSvg += `<text x="10" y="13" font-size="10" font-weight="bold" fill="#1E293B" font-family="${fontFam}">${escapeXml(data.title)}</text>`;
    }
    if (data.subtitle) {
        const subY = data.title ? 23 : 13;
        headerSvg += `<text x="10" y="${subY}" font-size="7.5" fill="#64748B" font-family="${fontFam}">${escapeXml(data.subtitle)}</text>`;
    }

    let bodySvg = '';
    if (chartType === 'pieChart') {
        bodySvg = renderPiePlot(data, safeW, safeH, titleH, fontFam);
    } else if (chartType === 'lineChart') {
        bodySvg = renderLinePlot(data, safeW, safeH, titleH, fontFam);
    } else {
        bodySvg = renderBarPlot(data, safeW, safeH, titleH, fontFam);
    }

    return `<svg width="100%" height="100%" viewBox="0 0 ${safeW} ${safeH}" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible; background-color: #FFFFFF;">
        <rect width="100%" height="100%" fill="#FFFFFF" rx="4"/>
        ${headerSvg}
        ${bodySvg}
    </svg>`;
}

function renderBarPlot(
    data: ResolvedChartData,
    width: number,
    height: number,
    titleH: number,
    fontFam: string
): string {
    const padL = 36;
    const padR = 12;
    const padT = titleH + 10;
    const padB = 22;

    const plotW = Math.max(width - padL - padR, 20);
    const plotH = Math.max(height - padT - padB, 20);

    const maxVal = data.maxValue > 0 ? data.maxValue * 1.15 : 100;
    const cats = data.categories;
    const numCats = Math.max(cats.length, 1);
    const seriesList = data.series;
    const numSeries = Math.max(seriesList.length, 1);

    let gridSvg = '';
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const y = padT + plotH - ratio * plotH;
        const valAtStep = ratio * maxVal;
        gridSvg += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="#F1F5F9" stroke-width="1"/>`;
        gridSvg += `<text x="${padL - 4}" y="${y + 2.5}" font-size="6.5" fill="#94A3B8" text-anchor="end" font-family="${fontFam}">${formatCompactNumber(valAtStep)}</text>`;
    }

    let barsSvg = '';
    const groupW = plotW / numCats;
    const barW = Math.min(22, Math.max(6, (groupW * 0.65) / numSeries));
    const totalBarsW = barW * numSeries;

    for (let cIdx = 0; cIdx < cats.length; cIdx++) {
        const cat = cats[cIdx];
        const groupCenterX = padL + (cIdx + 0.5) * groupW;

        barsSvg += `<text x="${groupCenterX}" y="${padT + plotH + 11}" font-size="7" fill="#475569" text-anchor="middle" font-family="${fontFam}">${escapeXml(truncateStr(cat, 10))}</text>`;

        for (let sIdx = 0; sIdx < seriesList.length; sIdx++) {
            const series = seriesList[sIdx];
            const item = series.items[cIdx];
            const val = item ? item.value : 0;
            const barH = (val / maxVal) * plotH;
            const barX = groupCenterX - totalBarsW / 2 + sIdx * barW;
            const barY = padT + plotH - barH;

            barsSvg += `<rect x="${barX}" y="${barY}" width="${Math.max(barW - 2, 2)}" height="${Math.max(barH, 0)}" fill="${series.color}" rx="2">
                <title>${escapeXml(series.name)} - ${escapeXml(cat)}: ${val}</title>
            </rect>`;

            if (plotH > 40 && barH > 10) {
                barsSvg += `<text x="${barX + (barW - 2) / 2}" y="${barY - 2}" font-size="6" fill="#1E293B" font-weight="600" text-anchor="middle" font-family="${fontFam}">${formatCompactNumber(val)}</text>`;
            }
        }
    }

    const baselineSvg = `<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#CBD5E1" stroke-width="1"/>`;

    return `${gridSvg}${baselineSvg}${barsSvg}`;
}

function renderPiePlot(
    data: ResolvedChartData,
    width: number,
    height: number,
    titleH: number,
    fontFam: string
): string {
    const padT = titleH + 6;
    const slices = data.pieSlices;

    const legendW = width > 220 ? 110 : 0;
    const plotW = width - legendW;
    const plotH = height - padT;

    const cx = plotW / 2;
    const cy = padT + plotH / 2;
    const radius = Math.min(plotW * 0.42, plotH * 0.42, 50);

    let slicesSvg = '';
    if (slices.length === 0) {
        slicesSvg = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#E2E8F0"/>`;
    } else if (slices.length === 1) {
        const s = slices[0];
        slicesSvg = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${s.color}">
            <title>${escapeXml(s.label)}: ${s.value}</title>
        </circle>`;
    } else {
        for (const s of slices) {
            const startRad = (s.startAngle - 90) * (Math.PI / 180);
            const endRad = (s.endAngle - 90) * (Math.PI / 180);

            const x1 = cx + radius * Math.cos(startRad);
            const y1 = cy + radius * Math.sin(startRad);
            const x2 = cx + radius * Math.cos(endRad);
            const y2 = cy + radius * Math.sin(endRad);

            const largeArc = s.percentage > 50 ? 1 : 0;
            const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            slicesSvg += `<path d="${pathD}" fill="${s.color}" stroke="#FFFFFF" stroke-width="1.5">
                <title>${escapeXml(s.label)}: ${s.value} (${s.percentage.toFixed(1)}%)</title>
            </path>`;

            if (s.percentage >= 12 && radius > 25) {
                const midRad = ((s.startAngle + s.endAngle) / 2 - 90) * (Math.PI / 180);
                const textR = radius * 0.65;
                const tx = cx + textR * Math.cos(midRad);
                const ty = cy + textR * Math.sin(midRad);
                slicesSvg += `<text x="${tx}" y="${ty + 2.5}" font-size="6.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle" font-family="${fontFam}">${Math.round(s.percentage)}%</text>`;
            }
        }
    }

    let legendSvg = '';
    if (legendW > 0 && slices.length > 0) {
        const legX = width - legendW + 6;
        let legY = padT + 10;
        for (const s of slices) {
            legendSvg += `<rect x="${legX}" y="${legY}" width="7" height="7" fill="${s.color}" rx="1.5"/>`;
            legendSvg += `<text x="${legX + 11}" y="${legY + 6}" font-size="6.5" fill="#334155" font-family="${fontFam}">${escapeXml(truncateStr(s.label, 12))} (${Math.round(s.percentage)}%)</text>`;
            legY += 13;
        }
    }

    return `${slicesSvg}${legendSvg}`;
}

function renderLinePlot(
    data: ResolvedChartData,
    width: number,
    height: number,
    titleH: number,
    fontFam: string
): string {
    const padL = 40;
    const padR = 16;
    const padT = titleH + 12;
    const padB = 22;

    const plotW = Math.max(width - padL - padR, 20);
    const plotH = Math.max(height - padT - padB, 20);

    const maxVal = data.maxValue > 0 ? data.maxValue * 1.15 : 100;
    const cats = data.categories;
    const numCats = Math.max(cats.length, 1);
    const seriesList = data.series;

    let gridSvg = '';
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const y = padT + plotH - ratio * plotH;
        const valAtStep = ratio * maxVal;
        gridSvg += `<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="#F1F5F9" stroke-width="1"/>`;
        gridSvg += `<text x="${padL - 4}" y="${y + 2.5}" font-size="6.5" fill="#94A3B8" text-anchor="end" font-family="${fontFam}">${formatCompactNumber(valAtStep)}</text>`;
    }

    const baselineSvg = `<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#CBD5E1" stroke-width="1"/>`;

    let linesSvg = '';
    const catSlot = plotW / numCats;

    for (let cIdx = 0; cIdx < cats.length; cIdx++) {
        const cat = cats[cIdx];
        const x = padL + (cIdx + 0.5) * catSlot;
        linesSvg += `<text x="${x}" y="${padT + plotH + 11}" font-size="7" fill="#475569" text-anchor="middle" font-family="${fontFam}">${escapeXml(truncateStr(cat, 10))}</text>`;
    }

    for (const series of seriesList) {
        const points: { x: number; y: number; val: number; cat: string }[] = [];

        for (let cIdx = 0; cIdx < cats.length; cIdx++) {
            const item = series.items[cIdx];
            const val = item ? item.value : 0;
            const x = padL + (cIdx + 0.5) * catSlot;
            const y = padT + plotH - (val / maxVal) * plotH;
            points.push({ x, y, val, cat: cats[cIdx] });
        }

        if (points.length > 0) {
            const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const areaData = `${pathData} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`;

            linesSvg += `<path d="${areaData}" fill="${series.color}" fill-opacity="0.10"/>`;
            linesSvg += `<path d="${pathData}" fill="none" stroke="${series.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

            for (const p of points) {
                linesSvg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${series.color}" stroke="#FFFFFF" stroke-width="1.2">
                    <title>${escapeXml(series.name)} - ${escapeXml(p.cat)}: ${p.val}</title>
                </circle>`;
                if (plotH > 35) {
                    linesSvg += `<text x="${p.x}" y="${p.y - 4}" font-size="6" fill="#1E293B" font-weight="600" text-anchor="middle" font-family="${fontFam}">${formatCompactNumber(p.val)}</text>`;
                }
            }
        }
    }

    return `${gridSvg}${baselineSvg}${linesSvg}`;
}

function formatCompactNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return Math.round(num).toString();
}

function truncateStr(str: string, maxLen: number): string {
    if (!str) {return '';}
    if (str.length <= maxLen) {return str;}
    return str.slice(0, maxLen - 1) + '…';
}

function escapeXml(str: string): string {
    if (!str) {return '';}
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
