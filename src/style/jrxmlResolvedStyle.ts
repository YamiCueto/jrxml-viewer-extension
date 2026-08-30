import { JrxmlBox, JrxmlPen } from '../model/jrxmlDocumentModel';

export interface ResolvedStyle {
    name?: string;
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
    pattern?: string;
    box?: JrxmlBox;
    pen?: JrxmlPen;
    radius?: number;
}
