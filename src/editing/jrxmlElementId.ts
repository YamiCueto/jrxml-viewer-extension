import { JrxmlDocument, JrxmlBand, JrxmlElement } from '../model/jrxmlDocumentModel';

export function assignStructuralIds(doc: JrxmlDocument): void {
    for (const band of doc.report.bands) {
        assignIdsToElements(band.elements, `band:${band.type}`);
    }
}

function assignIdsToElements(elements: JrxmlElement[], prefix: string): void {
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const currentId = `${prefix}/el:${i}`;
        el.id = currentId;
        if (el.children && el.children.length > 0) {
            assignIdsToElements(el.children, currentId);
        }
    }
}

export function parseStructuralId(id: string): { bandType: string; indexes: number[] } | null {
    if (!id || !id.startsWith('band:')) {
        return null;
    }

    const segments = id.split('/');
    const bandPart = segments[0];
    const bandType = bandPart.substring('band:'.length);
    const indexes: number[] = [];

    for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg.startsWith('el:')) {
            return null;
        }
        const num = parseInt(seg.substring('el:'.length), 10);
        if (isNaN(num)) {
            return null;
        }
        indexes.push(num);
    }

    return { bandType, indexes };
}

export function collectAllElementIds(doc: JrxmlDocument): string[] {
    const ids: string[] = [];
    const visit = (el: JrxmlElement) => {
        if (el.id) {
            ids.push(el.id);
        }
        if (el.children) {
            el.children.forEach(visit);
        }
    };

    for (const band of doc.report.bands) {
        band.elements.forEach(visit);
    }
    return ids;
}
