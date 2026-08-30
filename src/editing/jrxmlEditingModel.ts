import { JrxmlElement, JrxmlBand } from '../model/jrxmlDocumentModel';

export interface JrxmlElementPatch {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    text?: string;
    expression?: string;
    pattern?: string;
    fontName?: string;
    fontSize?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    isStrikeThrough?: boolean;
    forecolor?: string;
    backcolor?: string;
    mode?: string;
    horizontalAlignment?: string;
    verticalAlignment?: string;
    rotation?: string;
    markup?: string;
    radius?: number;
}

export interface ElementLookupResult {
    element: JrxmlElement;
    band: JrxmlBand;
    parent?: JrxmlElement;
    index: number;
}

export interface MutationResult {
    success: boolean;
    error?: string;
    mutatedElement?: JrxmlElement;
}
