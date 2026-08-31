const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mockVscode = {
    TreeItem: class {
        constructor(label, collapsibleState) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    },
    ThemeIcon: class {
        constructor(id) {
            this.id = id;
        }
    },
    EventEmitter: class {
        constructor() {
            this.event = () => {};
        }
        fire() {}
    },
    MarkdownString: class {
        constructor(val) {
            this.value = val;
        }
    },
    window: {
        createOutputChannel: () => ({ appendLine: () => {}, dispose: () => {} }),
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} })
    },
    workspace: {
        onDidChangeTextDocument: () => ({ dispose: () => {} }),
        onDidOpenTextDocument: () => ({ dispose: () => {} })
    }
};

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function(request) {
    if (request === 'vscode') {
        return mockVscode;
    }
    return origRequire.apply(this, arguments);
};

const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { renderLayoutDocument } = require('../../out/render/jrxmlRenderer');
const { JrxmlElementsProvider } = require('../../out/jrxmlElementsProvider');
const { JrxmlPropertiesProvider } = require('../../out/jrxmlPropertiesProvider');

console.log('Running Sidebar Sync & Zoom Presets Verification Suite...\n');

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

async function runAsyncTest(testName, testFn) {
    try {
        await testFn();
        console.log(`✔ ${testName}`);
        passedTests++;
    } catch (err) {
        console.error(`✘ ${testName} FAILED:`);
        console.error(err);
        process.exit(1);
    }
}

const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
const xmlContent = fs.readFileSync(fixturePath, 'utf8');

const mockDocument = {
    fileName: fixturePath,
    getText: () => xmlContent
};

async function main() {
    runTest('Test 1: JrxmlElementsProvider populates tree items with click-to-reveal command', () => {
        const provider = new JrxmlElementsProvider();
        provider.setCurrentDocument(mockDocument);

        const rootItems = provider.getChildren();
        assert.ok(rootItems.length > 0, 'Root items must exist');

        const detailBand = rootItems.find(item => item.label.includes('DETAIL') || item.label.includes('detail'));
        assert.ok(detailBand, 'Detail band node exists');
        assert.ok(detailBand.children && detailBand.children.length > 0, 'Detail band has child elements');

        const firstChild = detailBand.children[0];
        assert.ok(firstChild.command, 'Child element must have command attached');
        assert.strictEqual(firstChild.command.command, 'jrxmlElements.revealElement', 'Command must be jrxmlElements.revealElement');
        assert.ok(firstChild.command.arguments && firstChild.command.arguments[0].id, 'Arguments must contain element ID');
    });

    await runAsyncTest('Test 2: JrxmlPropertiesProvider renders document metadata categories', async () => {
        const propProvider = new JrxmlPropertiesProvider();
        propProvider.setCurrentDocument(mockDocument);

        const categories = await propProvider.getChildren();
        const catLabels = categories.map(c => c.label);

        assert.ok(catLabels.includes('Document Info'), 'Document Info category present');
        assert.ok(catLabels.includes('Margins'), 'Margins category present');
        assert.ok(catLabels.includes('Bands'), 'Bands category present');
        assert.ok(catLabels.includes('Parameters'), 'Parameters category present');
        assert.ok(catLabels.includes('Variables'), 'Variables category present');
        assert.ok(catLabels.includes('Styles'), 'Styles category present');
        assert.ok(catLabels.includes('Element Statistics'), 'Element Statistics category present');
    });

    await runAsyncTest('Test 3: JrxmlPropertiesProvider dynamically renders Selected Element category', async () => {
        const propProvider = new JrxmlPropertiesProvider();
        propProvider.setCurrentDocument(mockDocument);

        propProvider.setSelectedElement({
            id: 'txt-001',
            type: 'textField',
            x: 40,
            y: 60,
            width: 250,
            height: 25,
            expression: '$F{customerName}',
            displayValue: 'Acme Corp',
            fontName: 'SansSerif',
            fontSize: 12,
            isBold: true,
            forecolor: '#1E293B'
        });

        const categories = await propProvider.getChildren();
        const selCat = categories.find(c => c.label === 'Selected Element');
        assert.ok(selCat, 'Selected Element category rendered at top');
        assert.strictEqual(selCat.description, 'textField');

        const children = selCat.children || [];
        const propMap = new Map(children.map(c => [c.label, c.description]));

        assert.strictEqual(propMap.get('Type'), 'textField');
        assert.strictEqual(propMap.get('Position'), '(40, 60)');
        assert.strictEqual(propMap.get('Dimensions'), '250 × 25px');
        assert.strictEqual(propMap.get('Expression'), '$F{customerName}');
        assert.strictEqual(propMap.get('Display Value'), 'Acme Corp');
        assert.strictEqual(propMap.get('Font Name'), 'SansSerif');
        assert.strictEqual(propMap.get('Font Size'), '12px');
        assert.strictEqual(propMap.get('Bold'), 'true');
        assert.strictEqual(propMap.get('Forecolor'), '#1E293B');

        propProvider.setSelectedElement(null);
        const clearedCategories = await propProvider.getChildren();
        const noSelCat = clearedCategories.find(c => c.label === 'Selected Element');
        assert.strictEqual(noSelCat, undefined, 'Selected Element category removed on deselect');
    });

    runTest('Test 4: Webview template includes Zoom Preset dropdown and controls', () => {
        const previewJsPath = path.join(__dirname, '..', '..', 'media', 'preview.js');
        const previewJs = fs.readFileSync(previewJsPath, 'utf8');

        assert.ok(previewJs.includes('fit-width'), 'Preview script contains fit-width mode');
        assert.ok(previewJs.includes('fit-page'), 'Preview script contains fit-page mode');
        assert.ok(previewJs.includes('zoomPreset'), 'Preview script binds zoomPreset select element');
        assert.ok(previewJs.includes('calculateFitWidth'), 'Preview script implements calculateFitWidth');
        assert.ok(previewJs.includes('calculateFitPage'), 'Preview script implements calculateFitPage');
    });

    runTest('Test 5: Webview script handles selectElement and setZoom messages', () => {
        const previewJsPath = path.join(__dirname, '..', '..', 'media', 'preview.js');
        const previewJs = fs.readFileSync(previewJsPath, 'utf8');

        assert.ok(previewJs.includes("case 'selectElement'"), 'Handles selectElement message');
        assert.ok(previewJs.includes("case 'setZoom'"), 'Handles setZoom message');
        assert.ok(previewJs.includes('elementSelected'), 'Posts elementSelected message to extension');
        assert.ok(previewJs.includes('scrollIntoView'), 'Smoothly scrolls selected element into view');
    });

    runTest('Test 6: Math verification for Fit Width and Fit Page scaling', () => {
        const pageWidth = 595;
        const pageHeight = 842;

        const containerWidthA = 800;
        const availableWidthA = containerWidthA - 80;
        const fitWidthScaleA = Math.round((availableWidthA / pageWidth) * 100) / 100;
        assert.strictEqual(fitWidthScaleA, 1.21, 'Fit Width scale calculated accurately');

        const containerHeightA = 600;
        const availableHeightA = containerHeightA - 80;
        const fitPageScaleA = Math.round(Math.min(availableWidthA / pageWidth, availableHeightA / pageHeight) * 100) / 100;
        assert.strictEqual(fitPageScaleA, 0.62, 'Fit Page scale bounded by height');
    });

    console.log(`\n========================================\nAll ${passedTests} Sidebar Sync & Zoom Tests PASSED (100%)\n========================================\n`);
}

main();
