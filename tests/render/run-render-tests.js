const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { renderLayoutDocument } = require('../../out/render/jrxmlRenderer');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');

const doc = parseJrxmlDocument(xmlContent);
const layoutResult = layoutJrxmlDocument(doc);
const html = renderLayoutDocument(layoutResult);

console.log('Running Layout Renderer Verification Suite...\n');

assert(typeof html === 'string' && html.length > 0, 'Renderer produces HTML output string');
assert(!html.includes('<?xml'), 'HTML does not contain raw XML headers');
console.log('✔ Test 1: Renderer consumes pure LayoutResult without raw JRXML.');

assert(html.includes('width: 595px'), 'Page container has width: 595px');
assert(html.includes('height: 842px'), 'Page container has height: 842px');
console.log('✔ Test 2: Page 595x842 container generated.');

assert(!html.includes('height: 1646px'), 'Legacy vertical 1646px canvas does not exist');
console.log('✔ Test 3: No 1646px vertically stacked canvas.');

const bgLayerIndex = html.indexOf('layer-background');
const contentLayerIndex = html.indexOf('layer-content');
assert(bgLayerIndex !== -1 && contentLayerIndex !== -1, 'Both background and content layers present');
assert(html.includes('z-index: 1'), 'Background layer has low z-index (1)');
assert(html.includes('z-index: 10'), 'Content layer has higher z-index (10)');
console.log('✔ Test 4: Background layer renders behind content with explicit z-index.');

assert(html.includes('band-pageFooter'), 'PageFooter band is present');
assert(html.includes('top: 794px'), 'PageFooter is anchored at y=794px from LayoutResult');
console.log('✔ Test 5: PageFooter renders at the exact position provided by LayoutResult.');

assert(html.includes('element-ellipse'), 'Ellipse elements are rendered');
assert(html.includes('border-radius: 50%'), 'Ellipse has 50% border radius');
console.log('✔ Test 6: Ellipse elements rendered with oval geometry.');

assert(html.includes('element-frame'), 'Frame containers are rendered');
console.log('✔ Test 7: Frames rendered as containers.');

assert(html.includes('ACME GLOBAL ENTERPRISES'), 'Static text inside title frame is rendered');
assert(html.includes('$P{ReportTitle}'), 'TextField inside title frame is rendered');
assert(html.includes('TOTAL TRANSACTIONS'), 'Static text inside KPI frame is rendered');
assert(html.includes('$V{totalTransactionsCount}'), 'TextField inside KPI frame is rendered');
console.log('✔ Test 8: Elements inside frames are rendered.');

const nestedDoc = {
    report: {
        name: 'NestedRenderTest',
        pageWidth: 400,
        pageHeight: 400,
        topMargin: 10,
        bottomMargin: 10,
        leftMargin: 10,
        rightMargin: 10,
        properties: {},
        styles: [],
        parameters: [],
        fields: [],
        variables: [],
        groups: [],
        bands: [
            {
                type: 'detail',
                height: 100,
                elements: [
                    {
                        type: 'frame',
                        geometry: { x: 10, y: 10, width: 200, height: 80 },
                        children: [
                            {
                                type: 'frame',
                                geometry: { x: 5, y: 5, width: 100, height: 40 },
                                children: [
                                    {
                                        type: 'staticText',
                                        geometry: { x: 2, y: 2, width: 50, height: 15 },
                                        text: 'DeepText'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

const nestedLayout = layoutJrxmlDocument(nestedDoc);
const nestedHtml = renderLayoutDocument(nestedLayout);
assert(nestedHtml.includes('DeepText'), 'Deeply nested text is present in HTML');
assert((nestedHtml.match(/element-frame/g) || []).length >= 2, 'Both nested frames rendered');
console.log('✔ Test 9: Nested frames render recursively.');

assert(html.includes('element-chart'), 'Charts are rendered as elements');
assert(html.includes('Bar Chart') || html.includes('barChart'), 'Bar chart placeholder rendered');
assert(html.includes('Pie Chart') || html.includes('pieChart'), 'Pie chart placeholder rendered');
assert(html.includes('Line Chart') || html.includes('lineChart'), 'Line chart placeholder rendered');
console.log('✔ Test 10: Charts produce differentiated placeholders (Bar, Pie, Line).');

assert(html.includes('element-subreport'), 'Subreports are rendered');
assert(html.includes('subreports/CustomerOrderLinesSubreport.jasper') || html.includes('Subreport'), 'Subreport expression displayed');
console.log('✔ Test 11: Subreport placeholder rendered.');

assert(html.includes('data-element-id="'), 'Rendered elements retain data-element-id');
assert(html.includes('id="'), 'Rendered elements retain HTML id attribute');
console.log('✔ Test 12: Elements preserve stable IDs.');

assert(html.includes('clickable'), 'Interactive elements retain clickable class');
assert(html.includes('data-element=\''), 'Interactive elements retain data-element JSON payload for property inspection');
console.log('✔ Test 13: Interactive selection payload and clickable classes preserved.');

const multiPageDoc = {
    report: {
        name: 'MultiPageTest',
        pageWidth: 500,
        pageHeight: 500,
        topMargin: 10,
        bottomMargin: 10,
        leftMargin: 10,
        rightMargin: 10,
        properties: {},
        styles: [],
        parameters: [],
        fields: [],
        variables: [],
        groups: [],
        bands: [
            {
                type: 'detail',
                height: 300,
                elements: [{ type: 'staticText', geometry: { x: 0, y: 0, width: 100, height: 20 }, text: 'Detail P1' }]
            },
            {
                type: 'summary',
                height: 300,
                elements: [{ type: 'staticText', geometry: { x: 0, y: 0, width: 100, height: 20 }, text: 'Summary P2' }]
            },
            {
                type: 'pageFooter',
                height: 30,
                elements: [{ type: 'staticText', geometry: { x: 0, y: 0, width: 100, height: 20 }, text: 'Footer' }]
            }
        ]
    }
};

const multiPageLayout = layoutJrxmlDocument(multiPageDoc);
const multiPageHtml = renderLayoutDocument(multiPageLayout);
assert.strictEqual(multiPageLayout.totalPages, 2, 'Layout engine paginates into 2 pages');
assert(multiPageHtml.includes('id="page-1"'), 'Page 1 container exists');
assert(multiPageHtml.includes('id="page-2"'), 'Page 2 container exists');
console.log('✔ Test 14: Multi-page layout rendered as independent page containers.');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'render', 'jrxmlRenderer.ts'), 'utf8');
assert(!rendererSource.includes('fast-xml-parser'), 'Renderer does not import fast-xml-parser');
assert(!rendererSource.includes('XMLParser'), 'Renderer does not instantiate XMLParser');
console.log('✔ Test 15: Renderer is completely decoupled from fast-xml-parser.');

console.log('\n========================================');
console.log('All 15 Layout Renderer Tests PASSED (100%)');
console.log('========================================\n');
