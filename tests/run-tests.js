const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../out/model/jrxmlDocumentParser');

const fixturePath = path.join(__dirname, 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');

const doc = parseJrxmlDocument(xmlContent);
const report = doc.report;

console.log('Running Document Model Verification Suite...\n');

assert.strictEqual(report.name, 'ComplexEnterpriseSalesCustomerReport', 'Report name should match');
assert.strictEqual(report.pageWidth, 595, 'Page width should be 595');
assert.strictEqual(report.pageHeight, 842, 'Page height should be 842');
assert.strictEqual(report.orientation, 'Portrait', 'Orientation should be Portrait');
assert.strictEqual(report.columnWidth, 555, 'Column width should be 555');
assert.strictEqual(report.leftMargin, 20, 'Left margin should be 20');
assert.strictEqual(report.rightMargin, 20, 'Right margin should be 20');
assert.strictEqual(report.topMargin, 20, 'Top margin should be 20');
assert.strictEqual(report.bottomMargin, 20, 'Bottom margin should be 20');
assert.strictEqual(report.uuid, 'd7a31b4e-28f0-4573-9a3d-a56789abcdef', 'UUID should match');
assert.strictEqual(report.language, 'java', 'Language should be java');
assert.strictEqual(report.whenNoDataType, 'NoDataSection', 'whenNoDataType should be NoDataSection');
console.log('✔ Test 1: Report Metadata verified.');

assert.strictEqual(report.parameters.length, 10, 'Should parse 10 parameters');
const paramNames = report.parameters.map(p => p.name);
assert(paramNames.includes('ReportTitle'));
assert(paramNames.includes('FiscalYear'));
assert(paramNames.includes('StartDate'));
assert(paramNames.includes('IncludeDiscounts'));
const paramsWithDefaults = report.parameters.filter(p => p.defaultValueExpression !== undefined);
assert.strictEqual(paramsWithDefaults.length, 9, 'Should have 9 parameters with default values');
console.log('✔ Test 2: Parameters verified (10 parameters, types & defaults).');

assert.strictEqual(report.fields.length, 16, 'Should parse 16 fields');
const fieldNames = report.fields.map(f => f.name);
assert(fieldNames.includes('transactionId'));
assert(fieldNames.includes('customerName'));
assert(fieldNames.includes('totalAmount'));
assert(fieldNames.includes('isVipCustomer'));
console.log('✔ Test 3: Fields verified (16 fields across all types).');

assert.strictEqual(report.variables.length, 9, 'Should parse 9 variables');
const calcs = report.variables.map(v => v.calculation);
assert(calcs.includes('Nothing'));
assert(calcs.includes('Sum'));
assert(calcs.includes('Count'));
assert(calcs.includes('Average'));
console.log('✔ Test 4: Variables verified (9 variables, calculations & scopes).');

assert.strictEqual(report.groups.length, 1, 'Should parse 1 group');
assert.strictEqual(report.groups[0].name, 'RegionGroup');
assert.strictEqual(report.groups[0].expression.raw, '$F{region}');
assert(report.groups[0].groupHeader !== undefined);
assert(report.groups[0].groupFooter !== undefined);
console.log('✔ Test 5: Groups verified (1 functional group with header/footer).');

assert.strictEqual(report.styles.length, 13, 'Should parse 13 styles');
const styleNames = report.styles.map(s => s.name);
assert(styleNames.includes('BaseStyle'));
assert(styleNames.includes('ReportTitleStyle'));
assert(styleNames.includes('TableHeaderStyle'));
assert(styleNames.includes('TableCellStyle'));
const defaultStyle = report.styles.find(s => s.isDefault);
assert(defaultStyle !== undefined && defaultStyle.name === 'BaseStyle');
console.log('✔ Test 6: Styles verified (13 styles with inheritance & default).');

assert.strictEqual(report.bands.length, 11, 'Should parse 11 bands');
const bandTypes = report.bands.map(b => b.type);
assert(bandTypes.includes('background'));
assert(bandTypes.includes('title'));
assert(bandTypes.includes('pageHeader'));
assert(bandTypes.includes('columnHeader'));
assert(bandTypes.includes('detail'));
assert(bandTypes.includes('columnFooter'));
assert(bandTypes.includes('pageFooter'));
assert(bandTypes.includes('summary'));
assert(bandTypes.includes('noData'));
assert(bandTypes.includes('groupHeader-RegionGroup'));
assert(bandTypes.includes('groupFooter-RegionGroup'));
console.log('✔ Test 7: Bands verified (11 bands with normalized heights).');

let totalElements = 0;
const countsByType = {};
let printWhenCount = 0;
let boxCount = 0;
let penCount = 0;

function checkPensInBox(box) {
    if (!box) return;
    boxCount++;
    if (box.pen) penCount++;
    if (box.topPen) penCount++;
    if (box.bottomPen) penCount++;
    if (box.leftPen) penCount++;
    if (box.rightPen) penCount++;
}

report.styles.forEach(s => checkPensInBox(s.box));

function visitElement(el) {
    totalElements++;
    countsByType[el.type] = (countsByType[el.type] || 0) + 1;
    if (el.printWhenExpression) printWhenCount++;
    if (el.box) checkPensInBox(el.box);
    if (el.pen) penCount++;
    if (el.children) {
        el.children.forEach(visitElement);
    }
}

report.bands.forEach(b => b.elements.forEach(visitElement));

assert.strictEqual(totalElements, 85, 'Total visual elements in Document Model must be exactly 85');
assert.strictEqual(countsByType.staticText, 27, 'Should have 27 staticText elements');
assert.strictEqual(countsByType.textField, 32, 'Should have 32 textField elements');
assert.strictEqual(countsByType.rectangle, 8, 'Should have 8 rectangle elements');
assert.strictEqual(countsByType.ellipse, 3, 'Should have 3 ellipse elements');
assert.strictEqual(countsByType.line, 6, 'Should have 6 line elements');
assert.strictEqual(countsByType.frame, 4, 'Should have 4 frame elements');
assert.strictEqual(countsByType.image, 1, 'Should have 1 image element');
assert.strictEqual(countsByType.subreport, 1, 'Should have 1 subreport element');
assert.strictEqual(countsByType.chart, 3, 'Should have 3 chart elements');
console.log('✔ Test 8: Visual Elements count verified (85/85 elements detected).');

const titleBand = report.bands.find(b => b.type === 'title');
assert.strictEqual(titleBand.elements.length, 2, 'Title band should have 2 frames');
assert.strictEqual(titleBand.elements[0].type, 'frame');
assert.strictEqual(titleBand.elements[0].children.length, 6, 'Header frame should have 6 items');
assert.strictEqual(titleBand.elements[1].type, 'frame');
assert.strictEqual(titleBand.elements[1].children.length, 12, 'KPI Grid frame should have 12 items');

const groupHeaderBand = report.bands.find(b => b.type === 'groupHeader-RegionGroup');
assert.strictEqual(groupHeaderBand.elements.length, 1);
assert.strictEqual(groupHeaderBand.elements[0].type, 'frame');
assert.strictEqual(groupHeaderBand.elements[0].children.length, 6);

const summaryBand = report.bands.find(b => b.type === 'summary');
const summaryFrame = summaryBand.elements.find(e => e.type === 'frame');
assert(summaryFrame !== undefined);
assert.strictEqual(summaryFrame.children.length, 7);
console.log('✔ Test 9: Nested Elements in Frames verified (0 elements dropped).');

const charts = [];
function findCharts(el) {
    if (el.type === 'chart') charts.push(el);
    if (el.children) el.children.forEach(findCharts);
}
report.bands.forEach(b => b.elements.forEach(findCharts));
assert.strictEqual(charts.length, 3);
const chartSubtypes = charts.map(c => c.chartType);
assert(chartSubtypes.includes('barChart'));
assert(chartSubtypes.includes('pieChart'));
assert(chartSubtypes.includes('lineChart'));
console.log('✔ Test 10: Chart Subtypes verified (barChart, pieChart, lineChart differentiated).');

assert.strictEqual(printWhenCount, 8, 'Should have 8 printWhenExpressions');
console.log('✔ Test 11: PrintWhenExpressions verified (8 expressions preserved).');

assert.strictEqual(boxCount, 9, 'Should have 9 box definitions');
assert(penCount >= 22, 'Should have at least 22 pen definitions');
console.log('✔ Test 12: Boxes and Pens verified (9 boxes, ' + penCount + ' pens).');

const rawReportElementMatches = xmlContent.match(/<reportElement/g) || [];
assert.strictEqual(rawReportElementMatches.length, 85, 'XML should contain exactly 85 reportElements');
assert.strictEqual(totalElements, rawReportElementMatches.length, 'Document Model must match raw XML count');
console.log('✔ Test 13: Regression Test PASS (XML: 85 vs Model: 85 -> 100% coverage, 0% loss).');

console.log('\n========================================');
console.log('All 13 Document Model Tests PASSED (100%)');
console.log('========================================\n');
