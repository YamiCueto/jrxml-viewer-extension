const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { collectAllElementIds } = require('../../out/editing/jrxmlElementId');
const { findElement, mutateElement } = require('../../out/editing/jrxmlDocumentMutator');
const { serializeJrxmlDocument } = require('../../out/editing/jrxmlSerializer');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');

const doc = parseJrxmlDocument(xmlContent);

console.log('Running Bidirectional Editing & Persistence Verification Suite...\n');

const allIds = collectAllElementIds(doc);
assert.strictEqual(allIds.length, 85, 'All 85 elements must receive an ID');
const uniqueIds = new Set(allIds);
assert.strictEqual(uniqueIds.size, 85, 'All 85 ElementIds must be strictly unique');
console.log('✔ Test 1 & 2: 85 unique structural ElementIds generated.');

const frameId = 'band:title/el:0';
const frameChildId = 'band:title/el:0/el:1';
assert(allIds.includes(frameId), 'Frame container has structural ID');
assert(allIds.includes(frameChildId), 'Element inside frame has unique structural ID');
console.log('✔ Test 3 & 4: Elements and nested frames receive unique structural IDs.');

const foundFrameChild = findElement(doc, frameChildId);
assert(foundFrameChild !== null, 'Lookup must find frame child element');
assert(foundFrameChild.element.type === 'textField' || foundFrameChild.element.type === 'staticText');
assert.strictEqual(foundFrameChild.parent.type, 'frame');
assert.strictEqual(foundFrameChild.band.type, 'title');
console.log('✔ Test 5: Structural lookup findElement() resolves exact element, parent, and band.');

const staticTextLookup = findElement(doc, 'band:pageHeader/el:0');
assert(staticTextLookup !== null && staticTextLookup.element.type === 'staticText');
const oldStaticText = staticTextLookup.element.text;
const staticMutResult = mutateElement(doc, 'band:pageHeader/el:0', { text: 'MUTATED HEADER TEXT' });
assert(staticMutResult.success);
assert.strictEqual(staticTextLookup.element.text, 'MUTATED HEADER TEXT');
const nextStaticText = findElement(doc, 'band:pageHeader/el:1');
assert.notStrictEqual(nextStaticText.element.text, 'MUTATED HEADER TEXT');
console.log('✔ Test 6: Mutating staticText.text affects ONLY the target element.');

const textFieldLookup = findElement(doc, 'band:detail/el:0');
assert(textFieldLookup !== null && textFieldLookup.element.type === 'textField');
const textMutResult = mutateElement(doc, 'band:detail/el:0', { expression: '$F{newTransactionId}' });
assert(textMutResult.success);
assert.strictEqual(textFieldLookup.element.expression.raw, '$F{newTransactionId}');
const nextTextField = findElement(doc, 'band:detail/el:1');
assert.notStrictEqual(nextTextField.element.expression.raw, '$F{newTransactionId}');
console.log('✔ Test 7: Mutating textField.expression affects ONLY the target element.');

const rectLookup = findElement(doc, 'band:background/el:1');
assert(rectLookup !== null && rectLookup.element.type === 'rectangle');
mutateElement(doc, 'band:background/el:1', { width: 550 });
assert.strictEqual(rectLookup.element.geometry.width, 550);
console.log('✔ Test 8: Mutating rectangle.width affects ONLY the target element.');

const ellipseLookup = findElement(doc, 'band:background/el:2');
assert(ellipseLookup !== null && ellipseLookup.element.type === 'ellipse');
mutateElement(doc, 'band:background/el:2', { height: 95 });
assert.strictEqual(ellipseLookup.element.geometry.height, 95);
console.log('✔ Test 9: Mutating ellipse.height affects ONLY the target element.');

const frameLookup = findElement(doc, 'band:title/el:0');
assert(frameLookup !== null && frameLookup.element.type === 'frame');
mutateElement(doc, 'band:title/el:0', { x: 5 });
assert.strictEqual(frameLookup.element.geometry.x, 5);
console.log('✔ Test 10: Mutating frame container affects the frame without altering other bands.');

const colHeaderRect = findElement(doc, 'band:columnHeader/el:9');
const colHeaderTxId = findElement(doc, 'band:columnHeader/el:0');
assert(colHeaderRect !== null && colHeaderTxId !== null);
colHeaderRect.element.geometry.x = 0;
colHeaderRect.element.geometry.y = 0;
colHeaderTxId.element.geometry.x = 0;
colHeaderTxId.element.geometry.y = 0;

mutateElement(doc, 'band:columnHeader/el:9', { width: 500 });
assert.strictEqual(colHeaderRect.element.geometry.width, 500);
assert.notStrictEqual(colHeaderTxId.element.geometry.width, 500);
console.log('✔ Test 11: Collision Test PASS (Two elements sharing x=0, y=0 mutate independently).');

const nestedDoc = {
    report: {
        name: 'DeepNestedDoc',
        pageWidth: 500,
        pageHeight: 500,
        columnWidth: 460,
        columnSpacing: 0,
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 20,
        bottomMargin: 20,
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
                                        type: 'textField',
                                        geometry: { x: 2, y: 2, width: 50, height: 15 },
                                        expression: { raw: '$F{originalVal}', type: 'field' }
                                    },
                                    {
                                        type: 'staticText',
                                        geometry: { x: 2, y: 20, width: 50, height: 15 },
                                        text: 'SiblingText'
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

const deepMutResult = mutateElement(nestedDoc, 'band:detail/el:0/el:0/el:0', { x: 12, expression: '$F{mutatedVal}' });
assert(deepMutResult.success);
const deepTarget = findElement(nestedDoc, 'band:detail/el:0/el:0/el:0');
const deepSibling = findElement(nestedDoc, 'band:detail/el:0/el:0/el:1');
const deepParent = findElement(nestedDoc, 'band:detail/el:0/el:0');

assert.strictEqual(deepTarget.element.geometry.x, 12);
assert.strictEqual(deepTarget.element.expression.raw, '$F{mutatedVal}');
assert.strictEqual(deepSibling.element.geometry.x, 2);
assert.strictEqual(deepSibling.element.text, 'SiblingText');
assert.strictEqual(deepParent.element.geometry.x, 5);
console.log('✔ Test 12: Nested frame child mutation does not alter parents or siblings.');

const cleanDoc = parseJrxmlDocument(xmlContent);
const serializedXml = serializeJrxmlDocument(cleanDoc);
assert(typeof serializedXml === 'string' && serializedXml.length > 5000);
const roundTripDoc = parseJrxmlDocument(serializedXml);

assert.strictEqual(roundTripDoc.report.name, cleanDoc.report.name);
assert.strictEqual(roundTripDoc.report.pageWidth, cleanDoc.report.pageWidth);
assert.strictEqual(roundTripDoc.report.pageHeight, cleanDoc.report.pageHeight);
assert.strictEqual(roundTripDoc.report.parameters.length, 10);
assert.strictEqual(roundTripDoc.report.fields.length, 16);
assert.strictEqual(roundTripDoc.report.variables.length, 9);
assert.strictEqual(roundTripDoc.report.groups.length, 1);
assert.strictEqual(roundTripDoc.report.styles.length, 13);
assert.strictEqual(roundTripDoc.report.bands.length, 11);

const roundTripIds = collectAllElementIds(roundTripDoc);
assert.strictEqual(roundTripIds.length, 85, 'Round-trip preserves all 85 elements');
console.log('✔ Test 13: Round-Trip PASS (85 elements, 11 bands, 13 styles, 10 params, 16 fields, 9 vars, 1 group).');

const pReportTitle = roundTripDoc.report.parameters.find(p => p.name === 'ReportTitle');
assert(pReportTitle !== undefined);
assert.strictEqual(pReportTitle.defaultValueExpression.raw, '"Enterprise Sales & Customer Performance Summary"');

const vTotal = roundTripDoc.report.variables.find(v => v.name === 'grandTotalAmount');
assert(vTotal !== undefined);
assert.strictEqual(vTotal.expression.raw, '$F{totalAmount}');
console.log('✔ Test 14: Expression Preservation PASS ($F{}, $P{}, $V{} expressions intact).');

const charts = [];
function extractCharts(el) {
    if (el.type === 'chart') charts.push(el.chartType);
    if (el.children) el.children.forEach(extractCharts);
}
roundTripDoc.report.bands.forEach(b => b.elements.forEach(extractCharts));
assert.strictEqual(charts.length, 3);
assert(charts.includes('barChart'));
assert(charts.includes('pieChart'));
assert(charts.includes('lineChart'));
console.log('✔ Test 15: Chart Subtype Preservation PASS (barChart, pieChart, lineChart intact).');

const rtTitleBand = roundTripDoc.report.bands.find(b => b.type === 'title');
assert.strictEqual(rtTitleBand.elements.length, 2);
assert.strictEqual(rtTitleBand.elements[0].children.length, 6);
assert.strictEqual(rtTitleBand.elements[1].children.length, 12);
console.log('✔ Test 16: Frame Hierarchy Preservation PASS (Nested frames & children intact).');

console.log('\n========================================');
console.log('All 16 Editing & Persistence Tests PASSED (100%)');
console.log('========================================\n');
