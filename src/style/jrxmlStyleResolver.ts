import { JrxmlStyle, JrxmlElement, JrxmlBox } from '../model/jrxmlDocumentModel';
import { ResolvedStyle } from './jrxmlResolvedStyle';
import { EvaluationContext } from '../expression/jrxmlEvaluationContext';
import { evaluateExpression } from '../expression/jrxmlExpressionEvaluator';

export function resolveDocumentStyles(styles: JrxmlStyle[]): Map<string, ResolvedStyle> {
    const styleMap = new Map<string, JrxmlStyle>();
    for (const s of styles) {
        styleMap.set(s.name, s);
    }

    const defaultStyle = styles.find(s => s.isDefault);
    const resolvedDefault = defaultStyle ? resolveSingleStyle(defaultStyle, styleMap, new Set()) : undefined;

    const result = new Map<string, ResolvedStyle>();
    for (const s of styles) {
        const resolved = resolveSingleStyle(s, styleMap, new Set());
        if (resolvedDefault && s !== defaultStyle) {
            result.set(s.name, mergeStyles(resolvedDefault, resolved));
        } else {
            result.set(s.name, resolved);
        }
    }

    return result;
}

function resolveSingleStyle(
    style: JrxmlStyle,
    styleMap: Map<string, JrxmlStyle>,
    visited: Set<string>
): ResolvedStyle {
    if (visited.has(style.name)) {
        return createResolvedFromJrxmlStyle(style);
    }

    visited.add(style.name);

    let base: ResolvedStyle = {};
    if (style.parentStyle && styleMap.has(style.parentStyle)) {
        const parent = styleMap.get(style.parentStyle)!;
        base = resolveSingleStyle(parent, styleMap, visited);
    }

    const current = createResolvedFromJrxmlStyle(style);
    return mergeStyles(base, current);
}

function createResolvedFromJrxmlStyle(s: JrxmlStyle): ResolvedStyle {
    return {
        name: s.name,
        fontName: s.fontName,
        fontSize: s.fontSize,
        isBold: s.isBold,
        isItalic: s.isItalic,
        isUnderline: s.isUnderline,
        isStrikeThrough: s.isStrikeThrough,
        forecolor: s.forecolor,
        backcolor: s.backcolor,
        mode: s.mode,
        horizontalAlignment: s.horizontalAlignment,
        verticalAlignment: s.verticalAlignment,
        pattern: s.pattern,
        box: s.box ? cloneBox(s.box) : undefined
    };
}

function cloneBox(box: JrxmlBox): JrxmlBox {
    return {
        topPadding: box.topPadding,
        bottomPadding: box.bottomPadding,
        leftPadding: box.leftPadding,
        rightPadding: box.rightPadding,
        pen: box.pen ? { ...box.pen } : undefined,
        topPen: box.topPen ? { ...box.topPen } : undefined,
        bottomPen: box.bottomPen ? { ...box.bottomPen } : undefined,
        leftPen: box.leftPen ? { ...box.leftPen } : undefined,
        rightPen: box.rightPen ? { ...box.rightPen } : undefined
    };
}

function mergeBoxes(base?: JrxmlBox, override?: JrxmlBox): JrxmlBox | undefined {
    if (!base && !override) {return undefined;}
    if (!base) {return override ? cloneBox(override) : undefined;}
    if (!override) {return cloneBox(base);}

    return {
        topPadding: override.topPadding !== undefined ? override.topPadding : base.topPadding,
        bottomPadding: override.bottomPadding !== undefined ? override.bottomPadding : base.bottomPadding,
        leftPadding: override.leftPadding !== undefined ? override.leftPadding : base.leftPadding,
        rightPadding: override.rightPadding !== undefined ? override.rightPadding : base.rightPadding,
        pen: override.pen ? { ...override.pen } : (base.pen ? { ...base.pen } : undefined),
        topPen: override.topPen ? { ...override.topPen } : (base.topPen ? { ...base.topPen } : undefined),
        bottomPen: override.bottomPen ? { ...override.bottomPen } : (base.bottomPen ? { ...base.bottomPen } : undefined),
        leftPen: override.leftPen ? { ...override.leftPen } : (base.leftPen ? { ...base.leftPen } : undefined),
        rightPen: override.rightPen ? { ...override.rightPen } : (base.rightPen ? { ...base.rightPen } : undefined)
    };
}

export function mergeStyles(base: ResolvedStyle, override: ResolvedStyle): ResolvedStyle {
    return {
        name: override.name || base.name,
        fontName: override.fontName !== undefined ? override.fontName : base.fontName,
        fontSize: override.fontSize !== undefined ? override.fontSize : base.fontSize,
        isBold: override.isBold !== undefined ? override.isBold : base.isBold,
        isItalic: override.isItalic !== undefined ? override.isItalic : base.isItalic,
        isUnderline: override.isUnderline !== undefined ? override.isUnderline : base.isUnderline,
        isStrikeThrough: override.isStrikeThrough !== undefined ? override.isStrikeThrough : base.isStrikeThrough,
        forecolor: override.forecolor !== undefined ? override.forecolor : base.forecolor,
        backcolor: override.backcolor !== undefined ? override.backcolor : base.backcolor,
        mode: override.mode !== undefined ? override.mode : base.mode,
        horizontalAlignment: override.horizontalAlignment !== undefined ? override.horizontalAlignment : base.horizontalAlignment,
        verticalAlignment: override.verticalAlignment !== undefined ? override.verticalAlignment : base.verticalAlignment,
        rotation: override.rotation !== undefined ? override.rotation : base.rotation,
        pattern: override.pattern !== undefined ? override.pattern : base.pattern,
        box: mergeBoxes(base.box, override.box),
        pen: override.pen ? { ...override.pen } : (base.pen ? { ...base.pen } : undefined),
        radius: override.radius !== undefined ? override.radius : base.radius
    };
}

export function resolveElementStyle(
    element: JrxmlElement,
    allStyles: Map<string, ResolvedStyle> | JrxmlStyle[],
    evalContext?: EvaluationContext,
    rawStyles?: JrxmlStyle[]
): ResolvedStyle {
    const resolvedStyleMap = allStyles instanceof Map
        ? allStyles
        : resolveDocumentStyles(allStyles);

    let base: ResolvedStyle = {};
    if (element.styleName && resolvedStyleMap.has(element.styleName)) {
        base = resolvedStyleMap.get(element.styleName)!;
    }

    if (element.styleName && evalContext) {
        const stylesList = rawStyles || (Array.isArray(allStyles) ? allStyles : undefined);
        if (stylesList) {
            const rawStyle = stylesList.find(s => s.name === element.styleName);
            if (rawStyle && rawStyle.conditionalStyles && rawStyle.conditionalStyles.length > 0) {
                for (const cs of rawStyle.conditionalStyles) {
                    try {
                        const evalRes = evaluateExpression(cs.conditionExpression.raw, evalContext);
                        if (evalRes.status === 'RESOLVED' && evalRes.value) {
                            const condResolved = createResolvedFromJrxmlStyle(cs.style as JrxmlStyle);
                            base = mergeStyles(base, condResolved);
                        }
                    } catch {
                    }
                }
            }
        }
    }

    const elementStyle: ResolvedStyle = {
        fontName: element.fontName,
        fontSize: element.fontSize,
        isBold: element.isBold,
        isItalic: element.isItalic,
        isUnderline: element.isUnderline,
        isStrikeThrough: element.isStrikeThrough,
        forecolor: element.forecolor,
        backcolor: element.backcolor,
        mode: element.mode,
        horizontalAlignment: element.horizontalAlignment,
        verticalAlignment: element.verticalAlignment,
        rotation: element.rotation,
        pattern: element.pattern,
        box: element.box ? cloneBox(element.box) : undefined,
        pen: element.pen ? { ...element.pen } : undefined,
        radius: element.radius
    };

    return mergeStyles(base, elementStyle);
}
