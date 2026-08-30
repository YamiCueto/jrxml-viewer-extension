const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: false,
    reporter: 'list',
    use: {
        headless: true,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        actionTimeout: 10000,
        trace: 'off'
    }
});
