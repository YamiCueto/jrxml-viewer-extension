import { JrxmlDocument, JrxmlBand, JrxmlElement } from '../model/jrxmlDocumentModel';
import { JrxmlElementPatch, ElementLookupResult, MutationResult } from './jrxmlEditingModel';
import { parseStructuralId } from './jrxmlElementId';

export function findElement(doc: JrxmlDocument, elementId: string): ElementLookupResult | null {
    const parsed = parseStructuralId(elementId);
    if (!parsed) {
        return findElementFallback(doc, elementId);
    }

    const band = doc.report.bands.find(b => b.type === parsed.bandType);
    if (!band || parsed.indexes.length === 0) {
        return null;
    }

    let currentArray = band.elements;
    let parent: JrxmlElement | undefined = undefined;
    let targetElement: JrxmlElement | undefined = undefined;
    let lastIndex = -1;

    for (let i = 0; i < parsed.indexes.length; i++) {
        const idx = parsed.indexes[i];
        if (idx < 0 || idx >= currentArray.length) {
            return null;
        }

        targetElement = currentArray[idx];
        lastIndex = idx;

        if (i < parsed.indexes.length - 1) {
            parent = targetElement;
            if (!targetElement.children || targetElement.children.length === 0) {
                return null;
            }
            currentArray = targetElement.children;
        }
    }

    if (!targetElement) {
        return null;
    }

    return {
        element: targetElement,
        band,
        parent,
        index: lastIndex
    };
}

function findElementFallback(doc: JrxmlDocument, elementId: string): ElementLookupResult | null {
    for (const band of doc.report.bands) {
        const found = searchRecursive(band.elements, elementId, undefined, band);
        if (found) {
            return found;
        }
    }
    return null;
}

function searchRecursive(
    elements: JrxmlElement[],
    targetId: string,
    parent: JrxmlElement | undefined,
    band: JrxmlBand
): ElementLookupResult | null {
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.id === targetId || el.uuid === targetId) {
            return {
                element: el,
                band,
                parent,
                index: i
            };
        }

        if (el.children && el.children.length > 0) {
            const childResult = searchRecursive(el.children, targetId, el, band);
            if (childResult) {
                return childResult;
            }
        }
    }
    return null;
}

export function mutateElement(
    doc: JrxmlDocument,
    elementId: string,
    patch: JrxmlElementPatch
): MutationResult {
    const lookup = findElement(doc, elementId);
    if (!lookup) {
        return {
            success: false,
            error: `Element not found: ${elementId}`
        };
    }

    const el = lookup.element;

    if (patch.x !== undefined) {el.geometry.x = patch.x;}
    if (patch.y !== undefined) {el.geometry.y = patch.y;}
    if (patch.width !== undefined) {el.geometry.width = patch.width;}
    if (patch.height !== undefined) {el.geometry.height = patch.height;}

    if (patch.forecolor !== undefined) {el.forecolor = patch.forecolor;}
    if (patch.backcolor !== undefined) {el.backcolor = patch.backcolor;}
    if (patch.mode !== undefined) {el.mode = patch.mode;}

    if (el.type === 'staticText') {
        if (patch.text !== undefined) {el.text = patch.text;}
    }

    if (el.type === 'textField') {
        if (patch.expression !== undefined) {
            el.expression = { raw: patch.expression, type: 'custom' };
        }
        if (patch.pattern !== undefined) {el.pattern = patch.pattern;}
    }

    if (el.type === 'image') {
        if (patch.expression !== undefined) {
            el.imageExpression = { raw: patch.expression, type: 'custom' };
        }
    }

    if (el.type === 'subreport') {
        if (patch.expression !== undefined) {
            el.subreportExpression = { raw: patch.expression, type: 'custom' };
        }
    }

    if (el.type === 'rectangle') {
        if (patch.radius !== undefined) {el.radius = patch.radius;}
    }

    if (el.type === 'staticText' || el.type === 'textField') {
        if (patch.fontName !== undefined) {el.fontName = patch.fontName;}
        if (patch.fontSize !== undefined) {el.fontSize = patch.fontSize;}
        if (patch.isBold !== undefined) {el.isBold = patch.isBold;}
        if (patch.isItalic !== undefined) {el.isItalic = patch.isItalic;}
        if (patch.isUnderline !== undefined) {el.isUnderline = patch.isUnderline;}
        if (patch.isStrikeThrough !== undefined) {el.isStrikeThrough = patch.isStrikeThrough;}
        if (patch.horizontalAlignment !== undefined) {el.horizontalAlignment = patch.horizontalAlignment;}
        if (patch.verticalAlignment !== undefined) {el.verticalAlignment = patch.verticalAlignment;}
        if (patch.rotation !== undefined) {el.rotation = patch.rotation;}
        if (patch.markup !== undefined) {el.markup = patch.markup;}
    }

    return {
        success: true,
        mutatedElement: el
    };
}
