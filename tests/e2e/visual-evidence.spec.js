const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { startHarnessServer } = require('./workbenchHarness');

test.describe('JRXML Viewer Visual Evidence E2E Suite', () => {
    let serverInstance;
    let serverUrl;

    test.beforeAll(async () => {
        const fixturePath = path.join(__dirname, '..', 'fixtures', 'complex-report.jrxml');
        const jrxmlContent = fs.readFileSync(fixturePath, 'utf8');
        const result = await startHarnessServer(jrxmlContent, { port: 9878, showWorkbench: true });
        serverInstance = result.server;
        serverUrl = result.url;
    });

    test.afterAll(async () => {
        if (serverInstance) {
            serverInstance.close();
        }
    });

    test('renders full report canvas with authentic dimensions', async ({ page }) => {
        await page.goto(serverUrl);
        await page.waitForSelector('#canvas .jrxml-page', { state: 'visible' });
        
        const width = await page.locator('.jrxml-page').evaluate(el => el.offsetWidth);
        const height = await page.locator('.jrxml-page').evaluate(el => el.offsetHeight);
        expect(width).toBe(595);
        expect(height).toBe(842);
        
        await expect(page.locator('.page-layer.layer-background')).toBeAttached();
        await expect(page.locator('.band.band-pageFooter')).toBeAttached();
    });

    test('renders real SVG charts (Bar, Pie, Line)', async ({ page }) => {
        await page.goto(serverUrl);
        await page.waitForSelector('.element-chart svg');
        
        const svgs = page.locator('.element-chart svg');
        await expect(svgs).toHaveCount(3);
        
        const barTitle = await page.locator('text:has-text("Revenue by Region")').count();
        expect(barTitle).toBeGreaterThan(0);
        const pieTitle = await page.locator('text:has-text("Orders by Fulfillment Status")').count();
        expect(pieTitle).toBeGreaterThan(0);
        const lineTitle = await page.locator('text:has-text("Sales Trend over Timeline")').count();
        expect(lineTitle).toBeGreaterThan(0);
    });

    test('supports element selection and properties inspection', async ({ page }) => {
        await page.goto(serverUrl);
        const contentElement = page.locator('.layer-content .element.clickable').first();
        await contentElement.click();
        
        await page.waitForSelector('#propertiesPanel.visible', { state: 'visible', timeout: 3000 });
        await expect(page.locator('.element.clickable.selected')).toBeVisible();
        await expect(page.locator('#propertiesPanel')).toHaveClass(/visible/);
        await expect(page.locator('.property-input[data-property="x"]')).toBeVisible();
    });

    test('supports live property modification and updates', async ({ page }) => {
        await page.goto(serverUrl);
        const contentElement = page.locator('.layer-content .element.clickable').first();
        await contentElement.click();
        
        await page.waitForSelector('#propertiesPanel.visible', { state: 'visible', timeout: 3000 });
        const xInput = page.locator('.property-input[data-property="x"]');
        await xInput.fill('40');
        await xInput.dispatchEvent('change');
        
        const saveBtn = page.locator('#saveProperties');
        await saveBtn.click();
        
        const lastMsg = await page.evaluate(() => (window).__lastMessage);
        expect(lastMsg).toBeDefined();
        expect(lastMsg.command).toBe('updateElement');
    });

    test('displays hierarchical JRXML Explorer sidebar', async ({ page }) => {
        await page.goto(serverUrl);
        await expect(page.locator('#jrxmlExplorerSidebar')).toBeVisible();
        await expect(page.locator('#elementsTreeSection')).toBeVisible();
        await expect(page.locator('text="▾ JRXML FILES"')).toBeVisible();
        await expect(page.locator('text="▾ DOCUMENT PROPERTIES"')).toBeVisible();
    });

    test('supports zoom presets (Fit Width, Fit Page, 150%)', async ({ page }) => {
        await page.goto(serverUrl);
        const zoomSelect = page.locator('#zoomPreset');
        await expect(zoomSelect).toBeVisible();

        await zoomSelect.selectOption('1.5');
        const scale150 = await page.locator('#canvas').evaluate(el => el.style.transform);
        expect(scale150).toBe('scale(1.5)');
        await expect(page.locator('#zoomLevel')).toHaveText('150%');

        await zoomSelect.selectOption('fit-width');
        const scaleFitWidth = await page.locator('#canvas').evaluate(el => el.style.transform);
        expect(scaleFitWidth).toMatch(/scale\([0-9.]+\)/);
    });

    test('supports selectElement message to reveal and select element from sidebar', async ({ page }) => {
        await page.goto(serverUrl);
        const firstElemId = await page.locator('.layer-content .element.clickable').first().getAttribute('id');
        expect(firstElemId).toBeDefined();

        await page.evaluate((id) => {
            window.postMessage({ command: 'selectElement', elementId: id }, '*');
        }, firstElemId);

        await page.waitForSelector('.element.clickable.selected', { state: 'visible' });
        const selectedId = await page.locator('.element.clickable.selected').getAttribute('id');
        expect(selectedId).toBe(firstElemId);
        await expect(page.locator('#propertiesPanel')).toHaveClass(/visible/);
    });
});
