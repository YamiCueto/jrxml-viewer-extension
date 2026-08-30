const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { evaluateExpression, formatValueWithPattern } = require('../../out/expression/jrxmlExpressionEvaluator');
const {
    createDefaultPreviewDataset,
    createEvaluationContext,
    calculateAggregatedVariables
} = require('../../out/expression/jrxmlEvaluationContext');

console.log('Running Expression Evaluation Verification Suite...\n');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');
const doc = parseJrxmlDocument(xmlContent);

const dataset = createDefaultPreviewDataset(doc);
const context = createEvaluationContext(dataset, 0);

const pRes = evaluateExpression('$P{ReportTitle}', context);
assert.strictEqual(pRes.status, 'RESOLVED');
assert.strictEqual(pRes.value, 'Enterprise Sales & Customer Performance Summary');
console.log('✔ Test 1: $P{ReportTitle} resolves correctly.');

const fRes = evaluateExpression('$F{customerName}', context);
assert.strictEqual(fRes.status, 'RESOLVED');
assert.strictEqual(fRes.value, 'Acme Global Corp');
console.log('✔ Test 2: $F{customerName} resolves correctly.');

const vRes = evaluateExpression('$V{totalTransactionsCount}', context);
assert.strictEqual(vRes.status, 'RESOLVED');
assert.strictEqual(vRes.value, 3);
console.log('✔ Test 3: $V{totalTransactionsCount} resolves correctly.');

const missingF = evaluateExpression('$F{nonExistentField}', context);
assert.strictEqual(missingF.status, 'MISSING');
console.log('✔ Test 4: Missing field produces MISSING status.');

const missingP = evaluateExpression('$P{nonExistentParam}', context);
assert.strictEqual(missingP.status, 'MISSING');
console.log('✔ Test 5: Missing parameter produces MISSING status.');

const litStr = evaluateExpression('"Sample Literal"', context);
assert.strictEqual(litStr.status, 'RESOLVED');
assert.strictEqual(litStr.value, 'Sample Literal');
console.log('✔ Test 6: Literal string expression resolves.');

const litNum = evaluateExpression('123.45', context);
assert.strictEqual(litNum.status, 'RESOLVED');
assert.strictEqual(litNum.value, 123.45);
console.log('✔ Test 7: Numeric literal expression resolves.');

const litBool = evaluateExpression('true', context);
assert.strictEqual(litBool.status, 'RESOLVED');
assert.strictEqual(litBool.value, true);
console.log('✔ Test 8: Boolean literal expression resolves.');

const concatRes = evaluateExpression('"Customer: " + $F{customerName}', context);
assert.strictEqual(concatRes.status, 'RESOLVED');
assert.strictEqual(concatRes.value, 'Customer: Acme Global Corp');
console.log('✔ Test 9: String concatenation expression resolves.');

const ternaryRes1 = evaluateExpression('$F{isVipCustomer} ? "VIP Account" : "Standard"', context);
assert.strictEqual(ternaryRes1.status, 'RESOLVED');
assert.strictEqual(ternaryRes1.value, 'VIP Account');
console.log('✔ Test 10: Ternary conditional expression resolves.');

const dateExpr = '(new java.text.SimpleDateFormat("yyyy-MM-dd")).format($F{orderDate})';
const dateRes = evaluateExpression(dateExpr, context);
assert.strictEqual(dateRes.status, 'RESOLVED');
assert.strictEqual(dateRes.value, '2026-02-15');
console.log('✔ Test 11: Date formatting adapter resolves.');

const numFormatted = formatValueWithPattern(5935.0, '$ #,##0.00');
assert.strictEqual(numFormatted, '$ 5,935.00');
console.log('✔ Test 12: Numeric formatting with pattern resolves.');

const unsupportedRes = evaluateExpression('java.lang.System.getProperty("os.name")', context);
assert.strictEqual(unsupportedRes.status, 'UNSUPPORTED');
assert.strictEqual(unsupportedRes.displayValue, 'java.lang.System.getProperty("os.name")');
console.log('✔ Test 13: Unsupported expression generates UNSUPPORTED status without executing code.');

assert.strictEqual(unsupportedRes.rawExpression, 'java.lang.System.getProperty("os.name")');
console.log('✔ Test 14: Original raw expression is preserved.');

const evaluatorCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'expression', 'jrxmlExpressionEvaluator.ts'), 'utf8');
assert(!evaluatorCode.includes('eval('), 'Security audit: NO eval() allowed');
assert(!evaluatorCode.includes('new Function'), 'Security audit: NO new Function allowed');
assert(!evaluatorCode.includes('child_process'), 'Security audit: NO child_process allowed');
assert(!evaluatorCode.includes('exec('), 'Security audit: NO exec() allowed');
assert(!evaluatorCode.includes('spawn('), 'Security audit: NO spawn() allowed');
console.log('✔ Test 15: Security audit verified (0 dynamic code execution, 0 shell calls).');

const aggVars = calculateAggregatedVariables(doc, dataset.rows);
assert.strictEqual(aggVars['grandTotalAmount'], 12165.0);
console.log('✔ Test 16: Variable aggregation Sum calculation verified.');

assert.strictEqual(aggVars['totalTransactionsCount'], 3);
console.log('✔ Test 17: Variable aggregation Count calculation verified.');

const avgVars = calculateAggregatedVariables({
    report: {
        variables: [{ name: 'avgQty', calculation: 'Average', expression: { raw: '$F{orderQuantity}' } }]
    }
}, dataset.rows);
assert.strictEqual(avgVars['avgQty'], (5 + 2 + 10) / 3);
console.log('✔ Test 18: Variable aggregation Average calculation verified.');

assert.strictEqual(aggVars['REPORT_COUNT'], 3);
console.log('✔ Test 19: Report scope aggregation verified.');

const groupVars = calculateAggregatedVariables(doc, dataset.rows, 'region', 'North America');
assert.strictEqual(groupVars['grandTotalAmount'], 5935.0 + 1750.0);
console.log('✔ Test 20: Group scope aggregation for North America verified.');

const pwExprTrue = evaluateExpression('$P{IncludeDiscounts}', context);
assert.strictEqual(pwExprTrue.status, 'RESOLVED');
assert.strictEqual(pwExprTrue.value, true);

const pwExprNullCheck = evaluateExpression('$P{CompanyCode} != null', context);
assert.strictEqual(pwExprNullCheck.status, 'RESOLVED');
assert.strictEqual(pwExprNullCheck.value, true);
console.log('✔ Test 21: PrintWhenExpression evaluation on supported subset verified.');

console.log('\n========================================');
console.log('All 21 Expression Evaluation Tests PASSED (100%)');
console.log('========================================\n');
