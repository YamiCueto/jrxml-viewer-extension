import { JrxmlDocument, JrxmlBand, JrxmlElement } from '../model/jrxmlDocumentModel';
import {
    LayoutResult,
    LayoutPage,
    LayoutBand,
    LayoutElement,
    LayoutGeometry,
    LayoutMargins,
    LayoutDiagnostic,
    LayoutOptions,
    LayoutMode,
    BandRole,
    LayerType
} from './jrxmlLayoutModel';

export function layoutJrxmlDocument(doc: JrxmlDocument, options?: LayoutOptions): LayoutResult {
    const report = doc.report;
    const mode: LayoutMode = options?.mode || 'NORMAL_DATA';
    const diagnostics: LayoutDiagnostic[] = [];

    const pageWidth = report.pageWidth || 595;
    const pageHeight = report.pageHeight || 842;
    const margins: LayoutMargins = {
        top: report.topMargin !== undefined ? report.topMargin : 20,
        bottom: report.bottomMargin !== undefined ? report.bottomMargin : 20,
        left: report.leftMargin !== undefined ? report.leftMargin : 20,
        right: report.rightMargin !== undefined ? report.rightMargin : 20
    };

    const contentWidth = Math.max(0, pageWidth - margins.left - margins.right);
    const contentHeight = Math.max(0, pageHeight - margins.top - margins.bottom);

    if (contentWidth <= 0 || contentHeight <= 0) {
        diagnostics.push({
            code: 'INVALID_PAGE_DIMENSIONS',
            message: `Content area dimensions must be positive (got ${contentWidth}x${contentHeight})`,
            severity: 'ERROR'
        });
    }

    const pages: LayoutPage[] = [];

    if (mode === 'NO_DATA') {
        const page = createPage(1, pageWidth, pageHeight, margins, contentWidth, contentHeight);
        const bgBand = findBandByRole(report.bands, 'BACKGROUND');
        if (bgBand) {
            const layoutBg = layoutBand(bgBand, 'BACKGROUND', 'BACKGROUND', margins.left, margins.top, contentWidth, contentHeight, diagnostics);
            page.bands.push(layoutBg);
            page.elements.push(...layoutBg.elements);
        }

        const noDataBand = findBandByRole(report.bands, 'NO_DATA');
        if (noDataBand) {
            const layoutNoData = layoutBand(noDataBand, 'NO_DATA', 'CONTENT', margins.left, margins.top, contentWidth, noDataBand.height, diagnostics);
            page.bands.push(layoutNoData);
            page.elements.push(...layoutNoData.elements);
        }

        const pageFooterBand = findBandByRole(report.bands, 'PAGE_FOOTER');
        if (pageFooterBand) {
            const footerY = pageHeight - margins.bottom - pageFooterBand.height;
            const layoutFooter = layoutBand(pageFooterBand, 'PAGE_FOOTER', 'FOOTER', margins.left, footerY, contentWidth, pageFooterBand.height, diagnostics);
            page.bands.push(layoutFooter);
            page.elements.push(...layoutFooter.elements);
        }

        pages.push(page);
    } else {
        const bgBand = findBandByRole(report.bands, 'BACKGROUND');
        const pageHeaderBand = findBandByRole(report.bands, 'PAGE_HEADER');
        const titleBand = findBandByRole(report.bands, 'TITLE');
        const columnHeaderBand = findBandByRole(report.bands, 'COLUMN_HEADER');
        const detailBand = findBandByRole(report.bands, 'DETAIL');
        const columnFooterBand = findBandByRole(report.bands, 'COLUMN_FOOTER');
        const summaryBand = findBandByRole(report.bands, 'SUMMARY');
        const pageFooterBand = findBandByRole(report.bands, 'PAGE_FOOTER');

        const groupHeaderBands = report.bands.filter(b => b.type.startsWith('groupHeader'));
        const groupFooterBands = report.bands.filter(b => b.type.startsWith('groupFooter'));

        let currentPage = createPage(1, pageWidth, pageHeight, margins, contentWidth, contentHeight);
        let currentY = margins.top;

        if (bgBand) {
            const layoutBg = layoutBand(bgBand, 'BACKGROUND', 'BACKGROUND', margins.left, margins.top, contentWidth, contentHeight, diagnostics);
            currentPage.bands.push(layoutBg);
            currentPage.elements.push(...layoutBg.elements);
        }

        if (titleBand) {
            const layoutTitle = layoutBand(titleBand, 'TITLE', 'CONTENT', margins.left, currentY, contentWidth, titleBand.height, diagnostics);
            currentPage.bands.push(layoutTitle);
            currentPage.elements.push(...layoutTitle.elements);
            currentY += titleBand.height;
        }

        if (pageHeaderBand) {
            const layoutPageHeader = layoutBand(pageHeaderBand, 'PAGE_HEADER', 'CONTENT', margins.left, currentY, contentWidth, pageHeaderBand.height, diagnostics);
            currentPage.bands.push(layoutPageHeader);
            currentPage.elements.push(...layoutPageHeader.elements);
            currentY += pageHeaderBand.height;
        }

        for (const gh of groupHeaderBands) {
            const layoutGH = layoutBand(gh, 'GROUP_HEADER', 'CONTENT', margins.left, currentY, contentWidth, gh.height, diagnostics, gh.name);
            currentPage.bands.push(layoutGH);
            currentPage.elements.push(...layoutGH.elements);
            currentY += gh.height;
        }

        if (columnHeaderBand) {
            const layoutColHeader = layoutBand(columnHeaderBand, 'COLUMN_HEADER', 'CONTENT', margins.left, currentY, contentWidth, columnHeaderBand.height, diagnostics);
            currentPage.bands.push(layoutColHeader);
            currentPage.elements.push(...layoutColHeader.elements);
            currentY += columnHeaderBand.height;
        }

        if (detailBand) {
            const layoutDetail = layoutBand(detailBand, 'DETAIL', 'CONTENT', margins.left, currentY, contentWidth, detailBand.height, diagnostics);
            currentPage.bands.push(layoutDetail);
            currentPage.elements.push(...layoutDetail.elements);
            currentY += detailBand.height;
        }

        if (columnFooterBand) {
            const layoutColFooter = layoutBand(columnFooterBand, 'COLUMN_FOOTER', 'CONTENT', margins.left, currentY, contentWidth, columnFooterBand.height, diagnostics);
            currentPage.bands.push(layoutColFooter);
            currentPage.elements.push(...layoutColFooter.elements);
            currentY += columnFooterBand.height;
        }

        for (const gf of groupFooterBands) {
            const layoutGF = layoutBand(gf, 'GROUP_FOOTER', 'CONTENT', margins.left, currentY, contentWidth, gf.height, diagnostics, gf.name);
            currentPage.bands.push(layoutGF);
            currentPage.elements.push(...layoutGF.elements);
            currentY += gf.height;
        }

        if (summaryBand) {
            const availableContentY = pageHeight - margins.bottom - (pageFooterBand ? pageFooterBand.height : 0);
            if (currentY + summaryBand.height > availableContentY && currentPage.bands.length > 0) {
                if (pageFooterBand) {
                    const footerY = pageHeight - margins.bottom - pageFooterBand.height;
                    const layoutFooter = layoutBand(pageFooterBand, 'PAGE_FOOTER', 'FOOTER', margins.left, footerY, contentWidth, pageFooterBand.height, diagnostics);
                    currentPage.bands.push(layoutFooter);
                    currentPage.elements.push(...layoutFooter.elements);
                }
                pages.push(currentPage);

                currentPage = createPage(pages.length + 1, pageWidth, pageHeight, margins, contentWidth, contentHeight);
                currentY = margins.top;

                if (bgBand) {
                    const layoutBg = layoutBand(bgBand, 'BACKGROUND', 'BACKGROUND', margins.left, margins.top, contentWidth, contentHeight, diagnostics);
                    currentPage.bands.push(layoutBg);
                    currentPage.elements.push(...layoutBg.elements);
                }
                if (pageHeaderBand) {
                    const layoutPageHeader = layoutBand(pageHeaderBand, 'PAGE_HEADER', 'CONTENT', margins.left, currentY, contentWidth, pageHeaderBand.height, diagnostics);
                    currentPage.bands.push(layoutPageHeader);
                    currentPage.elements.push(...layoutPageHeader.elements);
                    currentY += pageHeaderBand.height;
                }
            }

            const layoutSummary = layoutBand(summaryBand, 'SUMMARY', 'CONTENT', margins.left, currentY, contentWidth, summaryBand.height, diagnostics);
            currentPage.bands.push(layoutSummary);
            currentPage.elements.push(...layoutSummary.elements);
            currentY += summaryBand.height;
        }

        if (pageFooterBand) {
            const footerY = pageHeight - margins.bottom - pageFooterBand.height;
            const layoutFooter = layoutBand(pageFooterBand, 'PAGE_FOOTER', 'FOOTER', margins.left, footerY, contentWidth, pageFooterBand.height, diagnostics);
            currentPage.bands.push(layoutFooter);
            currentPage.elements.push(...layoutFooter.elements);
        }

        pages.push(currentPage);
    }

    return {
        reportName: report.name,
        pageWidth,
        pageHeight,
        margins,
        contentWidth,
        contentHeight,
        mode,
        totalPages: pages.length,
        pages,
        diagnostics
    };
}

function createPage(
    pageNumber: number,
    width: number,
    height: number,
    margins: LayoutMargins,
    contentWidth: number,
    contentHeight: number
): LayoutPage {
    return {
        pageNumber,
        width,
        height,
        margins,
        contentWidth,
        contentHeight,
        bands: [],
        elements: []
    };
}

function findBandByRole(bands: JrxmlBand[], role: BandRole): JrxmlBand | undefined {
    switch (role) {
        case 'BACKGROUND': return bands.find(b => b.type === 'background');
        case 'TITLE': return bands.find(b => b.type === 'title');
        case 'PAGE_HEADER': return bands.find(b => b.type === 'pageHeader');
        case 'COLUMN_HEADER': return bands.find(b => b.type === 'columnHeader');
        case 'DETAIL': return bands.find(b => b.type === 'detail');
        case 'COLUMN_FOOTER': return bands.find(b => b.type === 'columnFooter');
        case 'SUMMARY': return bands.find(b => b.type === 'summary');
        case 'PAGE_FOOTER': return bands.find(b => b.type === 'pageFooter');
        case 'NO_DATA': return bands.find(b => b.type === 'noData');
        default: return undefined;
    }
}

function layoutBand(
    band: JrxmlBand,
    role: BandRole,
    layer: LayerType,
    x: number,
    y: number,
    width: number,
    height: number,
    diagnostics: LayoutDiagnostic[],
    groupName?: string
): LayoutBand {
    const bandId = `${band.type}_${x}_${y}`;
    const bounds: LayoutGeometry = { x, y, width, height };

    const elements = layoutElementsRecursively(
        band.elements,
        bandId,
        layer,
        x,
        y,
        undefined,
        width,
        height,
        diagnostics
    );

    return {
        id: bandId,
        type: band.type,
        role,
        groupName,
        height,
        layer,
        bounds,
        elements
    };
}

function layoutElementsRecursively(
    sourceElements: JrxmlElement[],
    bandId: string,
    layer: LayerType,
    parentAbsoluteX: number,
    parentAbsoluteY: number,
    parentId: string | undefined,
    containerWidth: number,
    containerHeight: number,
    diagnostics: LayoutDiagnostic[]
): LayoutElement[] {
    const result: LayoutElement[] = [];

    for (let i = 0; i < sourceElements.length; i++) {
        const el = sourceElements[i];
        const elemId = el.id || el.uuid || `${bandId}_el_${i}`;
        const localGeometry: LayoutGeometry = {
            x: el.geometry.x,
            y: el.geometry.y,
            width: el.geometry.width,
            height: el.geometry.height
        };

        const absoluteGeometry: LayoutGeometry = {
            x: parentAbsoluteX + localGeometry.x,
            y: parentAbsoluteY + localGeometry.y,
            width: localGeometry.width,
            height: localGeometry.height
        };

        if (localGeometry.x + localGeometry.width > containerWidth) {
            diagnostics.push({
                code: 'ELEMENT_OVERFLOW_WIDTH',
                message: `Element [${el.type}] at (${localGeometry.x}, ${localGeometry.y}) width ${localGeometry.width} exceeds container width ${containerWidth}`,
                severity: 'INFO',
                elementId: elemId,
                bandType: bandId
            });
        }

        let children: LayoutElement[] | undefined = undefined;
        if (el.children && el.children.length > 0) {
            children = layoutElementsRecursively(
                el.children,
                bandId,
                layer,
                absoluteGeometry.x,
                absoluteGeometry.y,
                elemId,
                localGeometry.width,
                localGeometry.height,
                diagnostics
            );
        }

        result.push({
            id: elemId,
            type: el.type,
            chartType: el.chartType,
            bandId,
            parentId,
            layer,
            localGeometry,
            absoluteGeometry,
            positionType: el.geometry.positionType,
            stretchType: el.geometry.stretchType,
            sourceElement: el,
            children
        });
    }

    return result;
}
