export interface JrxmlDocument {
    report: JrxmlReport;
}

export interface JrxmlReport {
    name: string;
    language?: string;
    pageWidth: number;
    pageHeight: number;
    orientation: string;
    columnWidth: number;
    columnSpacing: number;
    leftMargin: number;
    rightMargin: number;
    topMargin: number;
    bottomMargin: number;
    uuid?: string;
    whenNoDataType?: string;
    properties: Record<string, string>;
    styles: JrxmlStyle[];
    parameters: JrxmlParameter[];
    fields: JrxmlField[];
    variables: JrxmlVariable[];
    groups: JrxmlGroup[];
    bands: JrxmlBand[];
    queryString?: string;
}

export interface JrxmlStyle {
    name: string;
    parentStyle?: string;
    isDefault?: boolean;
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
    pattern?: string;
    box?: JrxmlBox;
}

export interface JrxmlParameter {
    name: string;
    class: string;
    isForPrompting?: boolean;
    defaultValueExpression?: JrxmlExpression;
}

export interface JrxmlField {
    name: string;
    class: string;
}

export interface JrxmlVariable {
    name: string;
    class: string;
    calculation: string;
    resetType?: string;
    resetGroup?: string;
    expression?: JrxmlExpression;
}

export interface JrxmlGroup {
    name: string;
    expression: JrxmlExpression;
    isStartNewPage?: boolean;
    isReprintHeaderOnEachPage?: boolean;
    groupHeader?: JrxmlBand;
    groupFooter?: JrxmlBand;
}

export interface JrxmlBand {
    type: string;
    name?: string;
    height: number;
    splitType?: string;
    elements: JrxmlElement[];
}

export interface JrxmlGeometry {
    x: number;
    y: number;
    width: number;
    height: number;
    positionType?: string;
    stretchType?: string;
}

export interface JrxmlPen {
    lineWidth?: number;
    lineColor?: string;
    lineStyle?: string;
}

export interface JrxmlBox {
    topPadding?: number;
    bottomPadding?: number;
    leftPadding?: number;
    rightPadding?: number;
    pen?: JrxmlPen;
    topPen?: JrxmlPen;
    bottomPen?: JrxmlPen;
    leftPen?: JrxmlPen;
    rightPen?: JrxmlPen;
}

export interface JrxmlExpression {
    raw: string;
    type?: 'field' | 'parameter' | 'variable' | 'custom';
    name?: string;
}

export interface JrxmlSubreportParameter {
    name: string;
    expression?: JrxmlExpression;
}

export interface JrxmlElement {
    id?: string;
    uuid?: string;
    type: string;
    chartType?: string;
    geometry: JrxmlGeometry;
    styleName?: string;
    forecolor?: string;
    backcolor?: string;
    mode?: string;
    printWhenExpression?: JrxmlExpression;
    box?: JrxmlBox;
    children?: JrxmlElement[];

    text?: string;
    expression?: JrxmlExpression;
    pattern?: string;
    fontName?: string;
    fontSize?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    isStrikeThrough?: boolean;
    horizontalAlignment?: string;
    verticalAlignment?: string;
    rotation?: string;
    markup?: string;
    isBlankWhenNull?: boolean;
    evaluationTime?: string;
    evaluationGroup?: string;
    isStretchWithOverflow?: boolean;

    direction?: string;
    pen?: JrxmlPen;
    radius?: number;

    scaleImage?: string;
    imageExpression?: JrxmlExpression;

    subreportExpression?: JrxmlExpression;
    connectionExpression?: JrxmlExpression;
    dataSourceExpression?: JrxmlExpression;
    parameters?: JrxmlSubreportParameter[];

    chartTitle?: string;
    chartSubtitle?: string;
    legend?: {
        textColor?: string;
        backgroundColor?: string;
    };
}
