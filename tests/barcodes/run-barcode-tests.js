const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { renderLayoutDocument } = require('../../out/render/jrxmlRenderer');
const { serializeJrxmlDocument } = require('../../out/editing/jrxmlSerializer');
const {
    renderBarcodeSvg,
    encodeCode128,
    encodeEan13,
    calculateEan13Checksum,
    encodeCode39,
    generateQrMatrix
} = require('../../out/render/barcodes/jrxmlBarcodeRenderer');

console.log('Running Barcode & QR Code Deterministic Verification Suite...\n');

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

runTest('Test 1: QR Code deterministic matrix generation and finder patterns', () => {
    const matrix = generateQrMatrix('https://example.com');
    assert.strictEqual(matrix.length, 21, 'QR matrix should have size 21x21 for Version 1');
    assert.strictEqual(matrix[0].length, 21);
    assert.strictEqual(matrix[0][0], true, 'Top-left finder outer corner');
    assert.strictEqual(matrix[0][6], true, 'Top-left finder outer corner');
    assert.strictEqual(matrix[6][0], true, 'Top-left finder outer corner');
    assert.strictEqual(matrix[6][6], true, 'Top-left finder outer corner');
    assert.strictEqual(matrix[3][3], true, 'Top-left finder center');
    assert.strictEqual(matrix[0][14], true, 'Top-right finder outer corner');
    assert.strictEqual(matrix[14][0], true, 'Bottom-left finder outer corner');
});

runTest('Test 2: Code 128 deterministic checksum and pattern calculation', () => {
    const text = 'INV-9901';
    const result = encodeCode128(text);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(typeof result.checksum, 'number');
    assert.ok(result.checksum >= 0 && result.checksum < 103, 'Checksum must be modulo 103');
    assert.strictEqual(result.pattern.length, (text.length + 3) * 6 + 1, 'Pattern length matches Code 128 spec');
});

runTest('Test 3: EAN-13 deterministic checksum calculation', () => {
    const digits12 = '750103131130';
    const cs = calculateEan13Checksum(digits12);
    assert.strictEqual(cs, 9, 'Expected EAN-13 checksum for 750103131130 is 9');

    const encoded = encodeEan13(digits12);
    assert.strictEqual(encoded.fullCode, '7501031311309');
    assert.strictEqual(encoded.bits.length, 95, 'EAN-13 bit string must be exactly 95 modules (3 + 42 + 5 + 42 + 3)');
    assert.strictEqual(encoded.bits.startsWith('101'), true, 'Left guard pattern');
    assert.strictEqual(encoded.bits.endsWith('101'), true, 'Right guard pattern');
    assert.strictEqual(encoded.bits.substring(45, 50), '01010', 'Center guard pattern');
});

runTest('Test 4: Code 39 deterministic pattern encoding', () => {
    const text = 'LOT-2026';
    const encoded = encodeCode39(text);
    assert.strictEqual(encoded.valid, true);
    assert.strictEqual(encoded.pattern.startsWith('bwbwBwBwbw'), true, 'Starts with asterisk guard');
    assert.strictEqual(encoded.pattern.endsWith('bwbwBwBwbw'), true, 'Ends with asterisk guard');
});

runTest('Test 5: Safe handling of null or empty payload', () => {
    const emptySvg = renderBarcodeSvg({
        barcodeType: 'QRCode',
        value: '',
        width: 100,
        height: 100
    });
    assert.ok(emptySvg.includes('<svg'), 'Returns SVG placeholder');
    assert.ok(emptySvg.includes('No data'), 'Communicates placeholder status');
});

runTest('Test 6: Parse barcode-report.jrxml model and identify barcode elements', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);

    assert.strictEqual(doc.report.name, 'BarcodeReport');
    const detailBand = doc.report.bands.find(b => b.type === 'detail');
    assert.ok(detailBand, 'Detail band exists');

    const barcodes = detailBand.elements.filter(e => e.type === 'componentElement' && e.componentType === 'barcode');
    assert.strictEqual(barcodes.length, 4, 'Must detect exactly 4 barcode components');

    const qr = barcodes.find(b => b.barcodeComponent.barcodeType === 'QRCode');
    const c128 = barcodes.find(b => b.barcodeComponent.barcodeType === 'Code128');
    const ean = barcodes.find(b => b.barcodeComponent.barcodeType === 'EAN13');
    const c39 = barcodes.find(b => b.barcodeComponent.barcodeType === 'Code39');

    assert.ok(qr, 'QR Code parsed');
    assert.ok(c128, 'Code 128 parsed');
    assert.ok(ean, 'EAN-13 parsed');
    assert.ok(c39, 'Code 39 parsed');
});

runTest('Test 7: Layout engine produces valid geometry and expressions for barcodes', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);
    const layout = layoutJrxmlDocument(doc);

    assert.strictEqual(layout.totalPages, 1);
    const detail = layout.pages[0].bands.find(b => b.type === 'detail');
    assert.ok(detail);

    const bcElements = detail.elements.filter(e => e.type === 'componentElement');
    assert.strictEqual(bcElements.length, 4);

    const c128El = bcElements.find(e => e.sourceElement.barcodeComponent.barcodeType === 'Code128');
    assert.strictEqual(c128El.displayValue, 'INV-2026-9901', 'Expression parameter resolved for Code128');
});

runTest('Test 8: Renderer outputs clean SVG vector graphics for all barcode types', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);
    const layout = layoutJrxmlDocument(doc);
    const html = renderLayoutDocument(layout);

    assert.ok(html.includes('class="element element-barcode clickable"'), 'Barcode containers rendered');
    assert.ok(html.includes('<svg'), 'Embedded SVGs present');
    assert.ok(html.includes('7501031311309'), 'EAN-13 text displayed');
    assert.ok(html.includes('INV-2026-9901'), 'Code 128 text displayed');
    assert.ok(html.includes('LOT-2026-X'), 'Code 39 text displayed');
});

runTest('Test 9: Round-trip XML serialization preserves componentElement attributes', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);
    const xmlOut = serializeJrxmlDocument(doc);

    assert.ok(xmlOut.includes('<componentElement>'), 'Serialized XML includes componentElement');
    assert.ok(xmlOut.includes('<jr:QRCode'), 'Serialized XML includes jr:QRCode');
    assert.ok(xmlOut.includes('<jr:Code128'), 'Serialized XML includes jr:Code128');
    assert.ok(xmlOut.includes('<jr:EAN13'), 'Serialized XML includes jr:EAN13');
    assert.ok(xmlOut.includes('<jr:Code39'), 'Serialized XML includes jr:Code39');

    const reParsed = parseJrxmlDocument(xmlOut);
    assert.strictEqual(reParsed.report.name, 'BarcodeReport');
    const reDetail = reParsed.report.bands.find(b => b.type === 'detail');
    const reBarcodes = reDetail.elements.filter(e => e.type === 'componentElement');
    assert.strictEqual(reBarcodes.length, 4, 'Re-parsed document retains all 4 barcodes');
});

console.log(`\n========================================\nAll ${passedTests} Barcode Tests PASSED (100%)\n========================================\n`);
