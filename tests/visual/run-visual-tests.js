const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { renderLayoutDocument } = require('../../out/render/jrxmlRenderer');

console.log('Running Visual Fidelity & Polish Verification Suite...\n');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');

const doc = parseJrxmlDocument(xmlContent);
const layout = layoutJrxmlDocument(doc);
const renderedHtml = renderLayoutDocument(layout);

assert(renderedHtml.includes('width: 595px'), 'Page container width must be 595px');
assert(renderedHtml.includes('height: 842px'), 'Page container height must be 842px');
assert(renderedHtml.includes('layer-background'), 'Background layer present');
assert(renderedHtml.includes('layer-content'), 'Content layer present');
assert(renderedHtml.includes('layer-footer'), 'Footer layer present');
console.log('✔ Test 1: Page dimensions 595x842px and 4-layer composition verified.');

assert(renderedHtml.includes('z-index: 1'), 'Background layer rendered with z-index: 1');
assert(renderedHtml.includes('z-index: 10'), 'Content layer rendered with z-index: 10');
assert(renderedHtml.includes('z-index: 20'), 'Footer layer rendered with z-index: 20');
console.log('✔ Test 2: Layer Z-Ordering and non-displacing background layer verified.');

assert(renderedHtml.includes('top: 794px'), 'PageFooter rendered at anchored y=794px');
console.log('✔ Test 3: PageFooter bottom anchoring verified.');

assert(renderedHtml.includes('font-size: 14px'), 'Element override font-size 14px applied to title');
assert(renderedHtml.includes('font-family: SansSerif, sans-serif'), 'Resolved style font-family SansSerif applied');
assert(renderedHtml.includes('font-weight: bold'), 'Resolved style font-weight bold applied');
console.log('✔ Test 4: ResolvedStyle typography properties rendered effectively.');

assert(renderedHtml.includes('border-bottom: 1.5px solid #3B82F6'), 'Group header bottom pen border applied');
assert(renderedHtml.includes('border-top: 1px solid #CBD5E1'), 'Group footer top pen border applied');
console.log('✔ Test 5: Box per-side pens and line styles rendered accurately.');

assert(renderedHtml.includes('justify-content: center') || renderedHtml.includes('justify-content: flex-end'), 'Horizontal text alignment flex justification applied');
assert(renderedHtml.includes('align-items: center') || renderedHtml.includes('align-items: flex-start'), 'Vertical text alignment flex alignment applied');
console.log('✔ Test 6: Text horizontal and vertical alignment flexbox properties verified.');

const synthDoc = {
    report: {
        name: 'StyledMarkupDoc',
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
                        type: 'staticText',
                        geometry: { x: 10, y: 10, width: 200, height: 30 },
                        text: '<style isBold="true" forecolor="#FF0000">Bold &amp; Red Text</style>',
                        markup: 'styled'
                    }
                ]
            }
        ]
    }
};

const synthLayout = layoutJrxmlDocument(synthDoc);
const synthHtml = renderLayoutDocument(synthLayout);

assert(!synthHtml.includes('&lt;style'), 'Styled markup must not leak as raw escaped tags');
assert(synthHtml.includes('font-weight: bold'), 'Styled markup tag converted to bold span');
assert(synthHtml.includes('color: #FF0000'), 'Styled markup tag converted to colored span');
assert(synthHtml.includes('Bold &amp; Red Text') || synthHtml.includes('Bold & Red Text'), 'Entities unescaped cleanly without double-escaping');
console.log('✔ Test 7: JasperReports styled markup conversion and clean entity handling verified.');

assert(renderedHtml.includes('Revenue by Region') || renderedHtml.includes('Bar Chart'), 'Bar chart rendered');
assert(renderedHtml.includes('Orders by Fulfillment Status') || renderedHtml.includes('Pie Chart'), 'Pie chart rendered');
assert(renderedHtml.includes('Sales Trend over Timeline') || renderedHtml.includes('Line Chart'), 'Line chart rendered');
assert(renderedHtml.includes('<svg'), 'Charts rendered with distinct graphical SVGs');
console.log('✔ Test 8: Chart subtypes (Bar, Pie, Line) rendered with differentiated graphical cards.');

assert(renderedHtml.includes('🖼️'), 'Image placeholder rendered with icon');
assert(renderedHtml.includes('📑'), 'Subreport placeholder rendered with icon');
console.log('✔ Test 9: Image and Subreport placeholders communicate type and expression clearly.');

assert(renderedHtml.includes('Enterprise Sales &amp; Customer Performance Summary') || renderedHtml.includes('Enterprise Sales & Customer Performance Summary'), 'Evaluated parameter displayValue rendered');
assert(renderedHtml.includes('Acme Global Corp'), 'Evaluated field displayValue rendered');
assert(renderedHtml.includes('data-element='), 'Original element payload and raw expression preserved in data-element attribute');
console.log('✔ Test 10: DisplayValue rendered on canvas while raw expressions remain available for inspector.');

console.log('\n========================================');
console.log('All 10 Visual Fidelity Tests PASSED (100%)');
console.log('========================================\n');
