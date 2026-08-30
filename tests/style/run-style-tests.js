const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { resolveDocumentStyles, resolveElementStyle } = require('../../out/style/jrxmlStyleResolver');

console.log('Running Style Resolution Verification Suite...\n');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');
const doc = parseJrxmlDocument(xmlContent);

const styles = doc.report.styles;
assert.strictEqual(styles.length, 13, '13 styles must load correctly');
console.log('✔ Test 1: 13 styles loaded from complex-report.jrxml.');

const resolvedMap = resolveDocumentStyles(styles);
assert.strictEqual(resolvedMap.size, 13, '13 styles resolved into the map');

const baseStyle = resolvedMap.get('BaseStyle');
assert(baseStyle !== undefined);
assert.strictEqual(baseStyle.fontName, 'SansSerif');
assert.strictEqual(baseStyle.fontSize, 9);
console.log('✔ Test 2: styleName BaseStyle resolves directly.');

const reportTitleStyle = resolvedMap.get('ReportTitleStyle');
assert(reportTitleStyle !== undefined);
assert.strictEqual(reportTitleStyle.fontSize, 18);
assert.strictEqual(reportTitleStyle.isBold, true);
assert.strictEqual(reportTitleStyle.fontName, 'SansSerif');
console.log('✔ Test 3: parentStyle inheritance works (inherits fontName SansSerif from BaseStyle).');

const groupHeaderStyle = resolvedMap.get('GroupHeaderStyle');
assert(groupHeaderStyle !== undefined);
assert.strictEqual(groupHeaderStyle.fontSize, 11);
assert.strictEqual(groupHeaderStyle.fontName, 'SansSerif');
assert.strictEqual(groupHeaderStyle.forecolor, '#1E40AF');
assert(groupHeaderStyle.box !== undefined);
assert.strictEqual(groupHeaderStyle.box.leftPadding, 8);
assert.strictEqual(groupHeaderStyle.box.bottomPen.lineWidth, 1.5);
console.log('✔ Test 4: Multi-level inheritance & box property merging works.');

const elementWithOverride = {
    type: 'staticText',
    styleName: 'ReportTitleStyle',
    fontSize: 24,
    forecolor: '#FF0000',
    geometry: { x: 0, y: 0, width: 100, height: 20 }
};
const resElStyle = resolveElementStyle(elementWithOverride, resolvedMap);
assert.strictEqual(resElStyle.fontSize, 24);
assert.strictEqual(resElStyle.forecolor, '#FF0000');
assert.strictEqual(resElStyle.fontName, 'SansSerif');
assert.strictEqual(resElStyle.isBold, true);
console.log('✔ Test 5: Element override takes precedence over style definition.');

const styleOverrideVsParent = resolvedMap.get('ReportSubtitleStyle');
assert.strictEqual(styleOverrideVsParent.fontSize, 10);
assert.strictEqual(styleOverrideVsParent.isItalic, true);
assert.strictEqual(styleOverrideVsParent.fontName, 'SansSerif');
console.log('✔ Test 6: Style override takes precedence over parentStyle.');

const cyclicStyles = [
    { name: 'CycleA', parentStyle: 'CycleB', fontSize: 12 },
    { name: 'CycleB', parentStyle: 'CycleA', fontSize: 14 }
];
const cyclicMap = resolveDocumentStyles(cyclicStyles);
assert.strictEqual(cyclicMap.size, 2);
assert(cyclicMap.has('CycleA') && cyclicMap.has('CycleB'));
console.log('✔ Test 7: Cyclic styles are detected safely without infinite recursion.');

const cardBoxStyle = resolvedMap.get('CardBoxStyle');
assert(cardBoxStyle !== undefined);
assert(cardBoxStyle.box !== undefined);
assert.strictEqual(cardBoxStyle.box.topPadding, 4);
assert.strictEqual(cardBoxStyle.box.leftPadding, 6);
assert.strictEqual(cardBoxStyle.box.bottomPadding, 4);
assert.strictEqual(cardBoxStyle.box.rightPadding, 6);
console.log('✔ Test 8: ResolvedStyle contains effective box paddings and pens.');

console.log('\n========================================');
console.log('All 8 Style Resolution Tests PASSED (100%)');
console.log('========================================\n');
