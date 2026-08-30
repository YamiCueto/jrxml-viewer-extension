const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { resolveElementStyle } = require('../../out/style/jrxmlStyleResolver');
const { createEvaluationContext } = require('../../out/expression/jrxmlEvaluationContext');
const { serializeJrxmlDocument } = require('../../out/editing/jrxmlSerializer');

console.log('Running Conditional Style Verification Suite...\n');

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

runTest('Test 1: Parse conditionalStyle definitions in styles', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);

    const statusStyle = doc.report.styles.find(s => s.name === 'StatusStyle');
    assert.ok(statusStyle, 'StatusStyle exists');
    assert.ok(statusStyle.conditionalStyles, 'Has conditionalStyles array');
    assert.strictEqual(statusStyle.conditionalStyles.length, 2, 'Has 2 conditional style rules');
});

runTest('Test 2: Matching condition applies style override (EXPIRED -> red)', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);

    const context = createEvaluationContext({
        rows: [{ status: 'EXPIRED' }],
        parameters: {},
        variables: {}
    });

    const element = {
        type: 'textField',
        geometry: { x: 0, y: 0, width: 100, height: 20 },
        styleName: 'StatusStyle'
    };

    const resolved = resolveElementStyle(element, doc.report.styles, context, doc.report.styles);
    assert.strictEqual(resolved.forecolor, '#DC2626', 'Forecolor should be overridden to #DC2626 (red)');
    assert.strictEqual(resolved.isBold, true, 'isBold should be true');
});

runTest('Test 3: Matching condition applies style override (ACTIVE -> green)', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);

    const context = createEvaluationContext({
        rows: [{ status: 'ACTIVE' }],
        parameters: {},
        variables: {}
    });

    const element = {
        type: 'textField',
        geometry: { x: 0, y: 0, width: 100, height: 20 },
        styleName: 'StatusStyle'
    };

    const resolved = resolveElementStyle(element, doc.report.styles, context, doc.report.styles);
    assert.strictEqual(resolved.forecolor, '#16A34A', 'Forecolor should be overridden to #16A34A (green)');
    assert.strictEqual(resolved.isBold, true, 'isBold should be true');
});

runTest('Test 4: Non-matching condition retains base style properties', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);

    const context = createEvaluationContext({
        rows: [{ status: 'PENDING' }],
        parameters: {},
        variables: {}
    });

    const element = {
        type: 'textField',
        geometry: { x: 0, y: 0, width: 100, height: 20 },
        styleName: 'StatusStyle'
    };

    const resolved = resolveElementStyle(element, doc.report.styles, context, doc.report.styles);
    assert.strictEqual(resolved.forecolor, '#000000', 'Retains BaseStyle forecolor (#000000)');
});

runTest('Test 5: Explicit element property overrides conditional style', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);

    const context = createEvaluationContext({
        rows: [{ status: 'EXPIRED' }],
        parameters: {},
        variables: {}
    });

    const element = {
        type: 'textField',
        geometry: { x: 0, y: 0, width: 100, height: 20 },
        styleName: 'StatusStyle',
        forecolor: '#2563EB'
    };

    const resolved = resolveElementStyle(element, doc.report.styles, context, doc.report.styles);
    assert.strictEqual(resolved.forecolor, '#2563EB', 'Explicit element property (#2563EB) wins over style rule');
});

runTest('Test 6: Erroneous/unsupported expression falls back safely without throw', () => {
    const customStyles = [
        {
            name: 'ErrorStyle',
            forecolor: '#111827',
            conditionalStyles: [
                {
                    conditionExpression: { raw: 'invalid.syntax(///)', type: 'custom' },
                    style: { forecolor: '#FF0000' }
                }
            ]
        }
    ];

    const context = createEvaluationContext({
        rows: [{}],
        parameters: {},
        variables: {}
    });

    const element = {
        type: 'textField',
        geometry: { x: 0, y: 0, width: 100, height: 20 },
        styleName: 'ErrorStyle'
    };

    const resolved = resolveElementStyle(element, customStyles, context, customStyles);
    assert.strictEqual(resolved.forecolor, '#111827', 'Falls back safely to base forecolor');
});

runTest('Test 7: Round-trip XML serialization preserves conditionalStyle blocks', () => {
    const jrxmlPath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const content = fs.readFileSync(jrxmlPath, 'utf8');
    const doc = parseJrxmlDocument(content);
    const xmlOut = serializeJrxmlDocument(doc);

    assert.ok(xmlOut.includes('<conditionalStyle'), 'XML output has conditionalStyle tag');
    assert.ok(xmlOut.includes('<conditionExpression><![CDATA[$F{status}.equals("EXPIRED")]]></conditionExpression>'), 'Condition expression serialized');

    const reParsed = parseJrxmlDocument(xmlOut);
    const reStyle = reParsed.report.styles.find(s => s.name === 'StatusStyle');
    assert.ok(reStyle);
    assert.strictEqual(reStyle.conditionalStyles.length, 2, 'Both conditional rules preserved after round-trip');
});

console.log(`\n========================================\nAll ${passedTests} Conditional Style Tests PASSED (100%)\n========================================\n`);
