import { LayoutResult } from '../layout/jrxmlLayoutModel';
import { JrxmlDocument } from '../model/jrxmlDocumentModel';
import { renderLayoutDocument } from '../render/jrxmlRenderer';

export interface StandaloneHtmlOptions {
    title?: string;
}

export function generateStandaloneHtml(
    layout: LayoutResult,
    doc: JrxmlDocument,
    options?: StandaloneHtmlOptions
): string {
    const reportTitle = options?.title || layout.reportName || doc.report.name || 'JasperReport Preview';
    const renderedPagesHtml = renderLayoutDocument(layout);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(reportTitle)}</title>
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: #1e1e1e;
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 28px 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }

        .pages-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 28px;
        }

        .jrxml-page {
            background-color: #ffffff;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
            position: relative;
            overflow: hidden;
        }

        .page-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }

        .layer-background { z-index: 1; }
        .layer-content { z-index: 10; }
        .layer-footer { z-index: 20; }
        .layer-overlay { z-index: 30; }

        .band {
            position: absolute;
            overflow: visible;
        }

        .element {
            position: absolute;
            box-sizing: border-box;
        }

        .element-content {
            overflow: hidden;
            word-wrap: break-word;
        }

        @media print {
            body {
                background-color: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                min-height: auto !important;
            }

            .pages-container {
                gap: 0 !important;
                display: block !important;
            }

            .jrxml-page {
                box-shadow: none !important;
                page-break-after: always;
                break-after: page;
                margin: 0 auto !important;
            }

            .jrxml-page:last-child {
                page-break-after: avoid;
                break-after: avoid;
            }

            @page {
                size: auto;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    ${renderedPagesHtml}
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
