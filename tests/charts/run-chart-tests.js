const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { renderLayoutDocument } = require('../../out/render/jrxmlRenderer');
const { resolveChartData } = require('../../out/render/charts/jrxmlChartData');
const { renderChartSvg } = require('../../out/render/charts/jrxmlChartRenderer');
const { createDefaultPreviewDataset, createEvaluationContext } = require('../../out/expression/jrxmlEvaluationContext');

console.log('Running Real Charts & Graphics Verification Suite...\n');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');

const doc = parseJrxmlDocument(xmlContent);
const defaultDataset = createDefaultPreviewDataset(doc);

const summaryBand = doc.report.bands.find(b => b.type === 'summary');
assert(summaryBand, 'Summary band must exist in fixture');

const barElem = summaryBand.elements.find(e => e.chartType === 'barChart');
assert(barElem, 'Bar chart element must be detected');
console.log('✔ Test 1: Bar chart detected in Document Model.');

const pieElem = summaryBand.elements.find(e => e.chartType === 'pieChart');
assert(pieElem, 'Pie chart element must be detected');
console.log('✔ Test 2: Pie chart detected in Document Model.');

const lineElem = summaryBand.elements.find(e => e.chartType === 'lineChart');
assert(lineElem, 'Line chart element must be detected');
console.log('✔ Test 3: Line chart detected in Document Model.');

const barData = resolveChartData(barElem, defaultDataset);
assert(barData.series.length > 0, 'Bar chart must receive dataset series');
assert(barData.categories.length > 0, 'Bar chart must receive categories');
console.log('✔ Test 4: Bar chart receives dataset from PreviewDataset.');

const pieData = resolveChartData(pieElem, defaultDataset);
assert(pieData.pieSlices.length > 0, 'Pie chart must receive slices');
console.log('✔ Test 5: Pie chart receives dataset from PreviewDataset.');

const lineData = resolveChartData(lineElem, defaultDataset);
assert(lineData.series.length > 0, 'Line chart must receive dataset series');
console.log('✔ Test 6: Line chart receives dataset from PreviewDataset.');

assert(barData.totalValue === 12165.0, `Bar total value must equal sum of amounts (got ${barData.totalValue})`);
const northAmericaVal = barData.series[0].items.find(i => i.category === 'North America');
assert(northAmericaVal && northAmericaVal.value === 7685.0, `North America sales must be 7685.0 (got ${northAmericaVal?.value})`);
console.log('✔ Test 7: Numeric values resolved correctly from dataset expressions.');

assert(barData.categories.includes('North America'), 'Bar categories include North America');
assert(barData.categories.includes('EMEA'), 'Bar categories include EMEA');
assert(pieData.categories.includes('COMPLETED'), 'Pie categories include COMPLETED');
assert(pieData.categories.includes('PENDING'), 'Pie categories include PENDING');
console.log('✔ Test 8: Categories resolved correctly.');

const barSvg = renderChartSvg(barData, 270, 140);
assert(barSvg.includes('<svg'), 'Bar chart output is SVG');
assert(barSvg.includes('viewBox="0 0 270 140"'), 'Bar chart SVG viewBox matches geometry');
assert(barSvg.includes('<rect'), 'Bar chart contains rect bars');

const pieSvg = renderChartSvg(pieData, 270, 140);
assert(pieSvg.includes('<svg'), 'Pie chart output is SVG');
assert(pieSvg.includes('<path'), 'Pie chart contains path slice arcs');

const lineSvg = renderChartSvg(lineData, 555, 110);
assert(lineSvg.includes('<svg'), 'Line chart output is SVG');
assert(lineSvg.includes('<circle'), 'Line chart contains point markers');
console.log('✔ Test 9: Real SVG output generated for Bar, Pie, Line charts.');

const layout = layoutJrxmlDocument(doc);
const summaryLayoutBand = layout.pages[0].bands.find(b => b.role === 'SUMMARY');
assert(summaryLayoutBand, 'Layout summary band exists');

const layoutBar = summaryLayoutBand.elements.find(e => e.chartType === 'barChart');
assert(layoutBar, 'Layout bar chart element exists');
assert(layoutBar.localGeometry.width === 270, 'Bar chart width is 270');
assert(layoutBar.localGeometry.height === 140, 'Bar chart height is 140');
console.log('✔ Test 10: Chart geometry matches LayoutResult.');

assert(barSvg.includes('Revenue by Region'), 'Bar chart title rendered');
assert(pieSvg.includes('Orders by Fulfillment Status'), 'Pie chart title rendered');
assert(lineSvg.includes('Sales Trend over Timeline'), 'Line chart title rendered');
console.log('✔ Test 11: Chart titles rendered inside SVG.');

const multiSeriesElem = {
    type: 'chart',
    chartType: 'barChart',
    geometry: { x: 0, y: 0, width: 300, height: 150 },
    chartTitle: 'Multi-Series Chart',
    categoryDataset: {
        series: [
            {
                seriesExpression: { raw: '"Target"' },
                categoryExpression: { raw: '$F{region}' },
                valueExpression: { raw: '10000' }
            },
            {
                seriesExpression: { raw: '"Actual"' },
                categoryExpression: { raw: '$F{region}' },
                valueExpression: { raw: '$F{totalAmount}' }
            }
        ]
    }
};
const multiData = resolveChartData(multiSeriesElem, defaultDataset);
assert(multiData.series.length === 2, 'Multi-series resolved to 2 series');
const multiSvg = renderChartSvg(multiData, 300, 150);
assert(multiSvg.includes('Target'), 'Multi-series title Target rendered');
assert(multiSvg.includes('Actual'), 'Multi-series title Actual rendered');
console.log('✔ Test 12: Multiple series work cleanly.');

const emptyDataset = { parameters: {}, rows: [], variables: {} };
const emptyBarData = resolveChartData(barElem, emptyDataset);
const emptySvg = renderChartSvg(emptyBarData, 270, 140);
assert(emptySvg.includes('<svg'), 'Empty dataset does not crash chart rendering');
console.log('✔ Test 13: Missing/empty dataset handled safely without crash.');

const unsupportedElem = {
    type: 'chart',
    chartType: 'barChart',
    geometry: { x: 0, y: 0, width: 200, height: 100 },
    categoryDataset: {
        series: [
            {
                seriesExpression: { raw: 'java.lang.Runtime.getRuntime().exec("calc")' },
                categoryExpression: { raw: 'new File("/tmp")' },
                valueExpression: { raw: '100' }
            }
        ]
    }
};
const unsuppData = resolveChartData(unsupportedElem, defaultDataset);
const unsuppSvg = renderChartSvg(unsuppData, 200, 100);
assert(unsuppSvg.includes('<svg'), 'Unsupported expression handled safely');
console.log('✔ Test 14: Unsupported Java/system expressions handled safely without dynamic execution.');

const renderedHtml = renderLayoutDocument(layout);
assert(renderedHtml.includes(`id="${layoutBar.id}"`), 'Stable ElementId preserved for barChart');
assert(renderedHtml.includes(`data-element-id="${layoutBar.id}"`), 'data-element-id preserved');
console.log('✔ Test 15: Stable structural ElementId preserved on chart container.');

assert(renderedHtml.includes('data-element='), 'Interactive data-element attribute present');
assert(renderedHtml.includes('element-chart clickable'), 'Interactive clickable classes preserved');
console.log('✔ Test 16: Chart selection payload and interaction classes preserved.');

assert(renderedHtml.includes('<svg width="100%" height="100%" viewBox="0 0 270 140"'), 'Export HTML contains embedded SVG bar chart');
assert(renderedHtml.includes('<svg width="100%" height="100%" viewBox="0 0 555 110"'), 'Export HTML contains embedded SVG line chart');
console.log('✔ Test 17: Full document export contains self-contained SVG charts.');

const renderA = renderLayoutDocument(layout);
const renderB = renderLayoutDocument(layout);
assert.strictEqual(renderA, renderB, 'Chart rendering must be 100% deterministic');
console.log('✔ Test 18: Deterministic chart rendering verified.');

console.log('\n========================================');
console.log('All 18 Real Charts & Graphics Tests PASSED (100%)');
console.log('========================================\n');
