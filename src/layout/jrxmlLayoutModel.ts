import { JrxmlElement } from '../model/jrxmlDocumentModel';
import { ResolvedStyle } from '../style/jrxmlResolvedStyle';
import { EvaluationContext } from '../expression/jrxmlEvaluationContext';

export type LayerType = 'BACKGROUND' | 'CONTENT' | 'FOOTER' | 'OVERLAY';

export type BandRole =
    | 'BACKGROUND'
    | 'TITLE'
    | 'PAGE_HEADER'
    | 'COLUMN_HEADER'
    | 'GROUP_HEADER'
    | 'DETAIL'
    | 'COLUMN_FOOTER'
    | 'GROUP_FOOTER'
    | 'SUMMARY'
    | 'PAGE_FOOTER'
    | 'NO_DATA';

export type LayoutMode = 'NORMAL_DATA' | 'NO_DATA';

export interface LayoutGeometry {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface LayoutMargins {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface LayoutElement {
    id: string;
    type: string;
    chartType?: string;
    bandId: string;
    parentId?: string;
    layer: LayerType;
    localGeometry: LayoutGeometry;
    absoluteGeometry: LayoutGeometry;
    positionType?: string;
    stretchType?: string;
    sourceElement: JrxmlElement;
    resolvedStyle?: ResolvedStyle;
    displayValue?: string;
    rawValue?: any;
    children?: LayoutElement[];
}

export interface LayoutBand {
    id: string;
    type: string;
    role: BandRole;
    groupName?: string;
    height: number;
    layer: LayerType;
    bounds: LayoutGeometry;
    elements: LayoutElement[];
}

export interface LayoutPage {
    pageNumber: number;
    width: number;
    height: number;
    margins: LayoutMargins;
    contentWidth: number;
    contentHeight: number;
    bands: LayoutBand[];
    elements: LayoutElement[];
}

export interface LayoutDiagnostic {
    code: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    elementId?: string;
    bandType?: string;
}

export interface LayoutOptions {
    mode?: LayoutMode;
    maxPages?: number;
    context?: EvaluationContext;
}

export interface LayoutResult {
    reportName: string;
    pageWidth: number;
    pageHeight: number;
    margins: LayoutMargins;
    contentWidth: number;
    contentHeight: number;
    mode: LayoutMode;
    totalPages: number;
    pages: LayoutPage[];
    diagnostics: LayoutDiagnostic[];
}
