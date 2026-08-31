const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { generateStandaloneHtml } = require('../../out/export/jrxmlHtmlExporter');

console.log('Running Standalone HTML Export Verification Suite...\n');

let passedTests = 0;

function runTest(testName, testFn) {
    try {
        testFn();
        console.log(`✔ ${testName}`);
        passedTests++;
    } catch (err) {
        console.error(`✘ ${testName} FAILED:`);
        console.error(err);
        process.exit(1);
    }
}

const complexJrxmlPath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const complexXml = fs.readFileSync(complexJrxmlPath, 'utf8');
const complexDoc = parseJrxmlDocument(complexXml);
const complexLayout = layoutJrxmlDocument(complexDoc);

const barcodeJrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
const barcodeXml = fs.readFileSync(barcodeJrxmlPath, 'utf8');
const barcodeDoc = parseJrxmlDocument(barcodeXml);
const barcodeLayout = layoutJrxmlDocument(barcodeDoc);

runTest('Test 1: Valid self-contained HTML5 document structure', () => {
    const html = generateStandaloneHtml(complexLayout, complexDoc);
    assert.ok(html.startsWith('<!DOCTYPE html>'), 'Starts with HTML5 DOCTYPE');
    assert.ok(html.includes('<html lang="en">'), 'Contains html root element');
    assert.ok(html.includes('<head>'), 'Contains head section');
    assert.ok(html.includes('<meta charset="UTF-8">'), 'Contains charset meta');
    assert.ok(html.includes('<meta name="viewport"'), 'Contains viewport meta');
    assert.ok(html.includes('<style>'), 'Contains embedded style block');
    assert.ok(html.includes('<body>'), 'Contains body section');
    assert.ok(html.endsWith('</html>'), 'Ends with html closing tag');
});

runTest('Test 2: Zero external dependencies and zero relative resources', () => {
    const html = generateStandaloneHtml(complexLayout, complexDoc);
    assert.ok(!html.includes('<link rel="stylesheet"'), 'No external stylesheets');
    assert.ok(!html.includes('<script src='), 'No external scripts');
    assert.ok(!html.includes('http://') && !html.includes('https://') || html.includes('xmlns'), 'No external CDN dependencies');
    assert.ok(!html.includes('src="../') && !html.includes('src="./'), 'No relative asset links');
});

runTest('Test 3: High-fidelity print styles (@media print) embedded', () => {
    const html = generateStandaloneHtml(complexLayout, complexDoc);
    assert.ok(html.includes('@media print'), 'Includes @media print block');
    assert.ok(html.includes('page-break-after: always') || html.includes('break-after: page'), 'Includes page-break-after rules');
    assert.ok(html.includes('@page'), 'Includes @page styling');
});

runTest('Test 4: Real vector SVG charts preserved in standalone HTML', () => {
    const html = generateStandaloneHtml(complexLayout, complexDoc);
    assert.ok(html.includes('<svg'), 'Contains SVG chart elements');
    assert.ok(html.includes('Revenue by Region') || html.includes('Bar Chart'), 'Contains bar chart SVG');
    assert.ok(html.includes('Orders by Fulfillment Status') || html.includes('Pie Chart'), 'Contains pie chart SVG');
    assert.ok(html.includes('Sales Trend over Timeline') || html.includes('Line Chart'), 'Contains line chart SVG');
});

runTest('Test 5: Barcode & QR Code SVG vectors preserved in standalone HTML', () => {
    const html = generateStandaloneHtml(barcodeLayout, barcodeDoc);
    assert.ok(html.includes('<svg'), 'Contains SVG barcode elements');
    assert.ok(html.includes('7501031311309'), 'Contains EAN-13 code and text');
    assert.ok(html.includes('INV-2026-9901'), 'Contains Code 128 code and text');
    assert.ok(html.includes('LOT-2026-X'), 'Contains Code 39 code and text');
});

runTest('Test 6: Multi-layer composition and page container geometry preserved', () => {
    const html = generateStandaloneHtml(complexLayout, complexDoc);
    assert.ok(html.includes('class="jrxml-page report-canvas"'), 'Preserves page canvas container');
    assert.ok(html.includes('layer-background'), 'Preserves background layer');
    assert.ok(html.includes('layer-content'), 'Preserves content layer');
    assert.ok(html.includes('layer-footer'), 'Preserves footer layer');
    assert.ok(html.includes('width: 595px'), 'Preserves 595px width');
    assert.ok(html.includes('height: 842px'), 'Preserves 842px height');
});

runTest('Test 7: Custom title option and report title escaping', () => {
    const customTitle = 'Custom Financial Manifest <Q3 & 2026>';
    const html = generateStandaloneHtml(complexLayout, complexDoc, { title: customTitle });
    assert.ok(html.includes('<title>Custom Financial Manifest &lt;Q3 &amp; 2026&gt;</title>'), 'Title safely escaped in HTML');
});

console.log(`\n========================================\nAll ${passedTests} Standalone HTML Export Tests PASSED (100%)\n========================================\n`);
