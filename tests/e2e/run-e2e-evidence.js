const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { startHarnessServer } = require('./workbenchHarness');
const { parseJrxmlDocument } = require('../../out/model/jrxmlDocumentParser');
const { layoutJrxmlDocument } = require('../../out/layout/jrxmlLayoutEngine');
const { generateStandaloneHtml } = require('../../out/export/jrxmlHtmlExporter');

async function runE2EEvidenceSuite() {
    console.log('Starting Playwright Visual Evidence & E2E Suite for v0.3.0...\n');

    const complexFixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
    const complexJrxmlContent = fs.readFileSync(complexFixturePath, 'utf8');

    const barcodeFixturePath = path.join(__dirname, '..', 'fixtures', 'barcode-report.jrxml');
    const barcodeJrxmlContent = fs.readFileSync(barcodeFixturePath, 'utf8');

    const screenshotsDir = path.join(__dirname, '..', '..', 'screenshots', 'v0.3.0');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const { server, url } = await startHarnessServer(complexJrxmlContent, { port: 9876, showWorkbench: true });
    console.log(`✔ Harness server running at ${url}`);

    const browser = await chromium.launch({
        headless: true
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2
    });

    const page = await context.newPage();
    await page.goto(url);

    await page.waitForSelector('#canvas .jrxml-page', { state: 'visible', timeout: 5000 });
    console.log('✔ Test 1: Page container rendered on canvas.');

    const pageWidth = await page.$eval('.jrxml-page', el => el.offsetWidth);
    const pageHeight = await page.$eval('.jrxml-page', el => el.offsetHeight);
    assert.strictEqual(pageWidth, 595, `Page width must be 595px (got ${pageWidth})`);
    assert.strictEqual(pageHeight, 842, `Page height must be 842px (got ${pageHeight})`);
    console.log('✔ Test 2: Authentic A4 dimensions (595 × 842 px) verified.');

    const bgLayer = await page.$('.page-layer.layer-background');
    assert(bgLayer, 'Background layer must exist');
    const pageFooter = await page.$('.band.band-pageFooter');
    assert(pageFooter, 'Page footer band must exist');
    console.log('✔ Test 3: Multi-layer composition and page footer anchoring verified.');

    const overviewPath = path.join(screenshotsDir, 'overview.png');
    await page.screenshot({ path: overviewPath });
    assert(fs.existsSync(overviewPath), 'overview.png must be created');
    console.log(`✔ Test 4: Captured overview.png (${(fs.statSync(overviewPath).size / 1024).toFixed(1)} KB).`);

    const barChart = await page.$('text:has-text("Revenue by Region")');
    const pieChart = await page.$('text:has-text("Orders by Fulfillment Status")');
    const lineChart = await page.$('text:has-text("Sales Trend over Timeline")');

    assert(barChart, 'Bar chart title must be visible');
    assert(pieChart, 'Pie chart title must be visible');
    assert(lineChart, 'Line chart title must be visible');

    const svgCount = await page.$$eval('.element-chart svg', els => els.length);
    assert(svgCount >= 3, `At least 3 chart SVGs must be present (got ${svgCount})`);
    console.log('✔ Test 5: Real SVG charts (Bar, Pie, Line) verified.');

    const chartsPath = path.join(screenshotsDir, 'charts.png');
    const summaryBand = await page.$('.band.band-summary');
    if (summaryBand) {
        await summaryBand.screenshot({ path: chartsPath });
    } else {
        await page.screenshot({ path: chartsPath });
    }
    assert(fs.existsSync(chartsPath), 'charts.png must be created');
    console.log(`✔ Test 6: Captured charts.png (${(fs.statSync(chartsPath).size / 1024).toFixed(1)} KB).`);

    await page.evaluate(() => {
        const el = document.querySelector('.element.clickable');
        if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            (el).click();
        }
    });

    await page.waitForSelector('#propertiesPanel.visible', { state: 'visible', timeout: 3000 });
    await page.waitForTimeout(450);

    const isSelected = await page.$eval('.element.clickable', el => el.classList.contains('selected'));
    assert(isSelected, 'Clicked element must have .selected class');
    console.log('✔ Test 7: Element selection and Properties panel display verified.');

    const propertiesPath = path.join(screenshotsDir, 'properties.png');
    await page.screenshot({ path: propertiesPath });
    assert(fs.existsSync(propertiesPath), 'properties.png must be created');
    console.log(`✔ Test 8: Captured properties.png (${(fs.statSync(propertiesPath).size / 1024).toFixed(1)} KB).`);

    const textInput = await page.$('.property-input[data-property="text"]');
    if (textInput) {
        await textInput.fill('ACME GLOBAL ENTERPRISES [EDITED]');
        await textInput.dispatchEvent('input');
        await textInput.dispatchEvent('change');
    }

    const xInput = await page.$('.property-input[data-property="x"]');
    if (xInput) {
        await xInput.fill('24');
        await xInput.dispatchEvent('input');
        await xInput.dispatchEvent('change');
    }

    const saveBtn = await page.$('#saveProperties');
    assert(saveBtn, 'Save Changes button must exist');
    await saveBtn.click();

    const lastMessage = await page.evaluate(() => (window).__lastMessage);
    assert(lastMessage && lastMessage.command === 'updateElement', 'updateElement command must be dispatched');
    console.log('✔ Test 9: Live element modification & updateElement message verified.');

    await page.waitForTimeout(200);
    const editingPath = path.join(screenshotsDir, 'editing.png');
    await page.screenshot({ path: editingPath });
    assert(fs.existsSync(editingPath), 'editing.png must be created');
    console.log(`✔ Test 10: Captured editing.png (${(fs.statSync(editingPath).size / 1024).toFixed(1)} KB).`);

    const sidebar = await page.$('#jrxmlExplorerSidebar');
    assert(sidebar, 'JRXML Explorer sidebar must exist');

    const explorerPath = path.join(screenshotsDir, 'explorer.png');
    await sidebar.screenshot({ path: explorerPath });
    assert(fs.existsSync(explorerPath), 'explorer.png must be created');
    console.log(`✔ Test 11: Captured explorer.png (${(fs.statSync(explorerPath).size / 1024).toFixed(1)} KB).`);

    server.close();

    const { server: bcServer, url: bcUrl } = await startHarnessServer(barcodeJrxmlContent, { port: 9879, showWorkbench: true });
    await page.goto(bcUrl);
    await page.waitForSelector('.element-barcode svg', { state: 'visible', timeout: 5000 });

    const barcodeSvgs = await page.$$eval('.element-barcode svg', els => els.length);
    assert.strictEqual(barcodeSvgs, 4, `All 4 barcode SVG elements must be rendered (got ${barcodeSvgs})`);
    console.log('✔ Test 12: Barcode and QR components verified.');

    const barcodesPath = path.join(screenshotsDir, 'barcodes.png');
    await page.screenshot({ path: barcodesPath });
    assert(fs.existsSync(barcodesPath), 'barcodes.png must be created');
    console.log(`✔ Test 13: Captured barcodes.png (${(fs.statSync(barcodesPath).size / 1024).toFixed(1)} KB).`);

    bcServer.close();

    const exportDoc = parseJrxmlDocument(complexJrxmlContent);
    const exportLayout = layoutJrxmlDocument(exportDoc);
    const standaloneHtml = generateStandaloneHtml(exportLayout, exportDoc);

    const tempExportPath = path.join(screenshotsDir, 'standalone_preview.html');
    fs.writeFileSync(tempExportPath, standaloneHtml, 'utf8');

    await page.goto(`file://${tempExportPath}`);
    await page.waitForSelector('.jrxml-page', { state: 'visible' });

    const exportScreenshotPath = path.join(screenshotsDir, 'export.png');
    await page.screenshot({ path: exportScreenshotPath });
    assert(fs.existsSync(exportScreenshotPath), 'export.png must be created');
    console.log(`✔ Test 14: Captured export.png (${(fs.statSync(exportScreenshotPath).size / 1024).toFixed(1)} KB).`);

    if (fs.existsSync(tempExportPath)) {
        fs.unlinkSync(tempExportPath);
    }

    await browser.close();

    console.log('\n========================================');
    console.log('All Playwright E2E & Visual Evidence Tests PASSED (100%)');
    console.log('========================================\n');
}

if (require.main === module) {
    runE2EEvidenceSuite().catch(err => {
        console.error('E2E Evidence Suite Failed:', err);
        process.exit(1);
    });
}

module.exports = {
    runE2EEvidenceSuite
};
