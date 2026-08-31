export interface BarcodeRenderOptions {
    barcodeType: string;
    value: string;
    width: number;
    height: number;
    drawText?: boolean;
    errorCorrectionLevel?: string;
    barWidth?: number;
    barHeight?: number;
}

export function renderBarcodeSvg(options: BarcodeRenderOptions): string {
    const { barcodeType, value, width, height, drawText = true } = options;
    const safeW = Math.max(width || 100, 20);
    const safeH = Math.max(height || 40, 20);

    const val = (value || '').trim();
    if (!val) {
        return renderBarcodePlaceholder(barcodeType, safeW, safeH, 'No data');
    }

    const normType = (barcodeType || '').toLowerCase();

    if (normType.includes('qr') || normType.includes('qrcode')) {
        return renderQrCodeSvg(val, safeW, safeH, options.errorCorrectionLevel);
    } else if (normType.includes('128') || normType.includes('code128')) {
        return renderCode128Svg(val, safeW, safeH, drawText);
    } else if (normType.includes('ean13') || normType.includes('ean-13') || normType.includes('ean')) {
        return renderEan13Svg(val, safeW, safeH, drawText);
    } else if (normType.includes('39') || normType.includes('code39')) {
        return renderCode39Svg(val, safeW, safeH, drawText);
    }

    return renderCode128Svg(val, safeW, safeH, drawText);
}

function renderBarcodePlaceholder(type: string, w: number, h: number, msg: string): string {
    return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#F8F9FA;">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#F8F9FA" stroke="#D1D5DB" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${w / 2}" y="${h / 2 - 4}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="#6B7280">${escapeXml(type || 'Barcode')}</text>
        <text x="${w / 2}" y="${h / 2 + 10}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8" fill="#9CA3AF">${escapeXml(msg)}</text>
    </svg>`;
}

export function encodeCode128(text: string): { pattern: number[]; checksum: number; valid: boolean } {
    const START_B = 104;
    const STOP = 106;

    const patterns: number[][] = [
        [2,1,2,2,2,2], [2,2,2,1,2,2], [2,2,2,2,2,1], [1,2,1,2,2,3], [1,2,1,3,2,2],
        [1,3,1,2,2,2], [1,2,2,2,1,3], [1,2,2,3,1,2], [1,3,2,2,1,2], [2,2,1,2,1,3],
        [2,2,1,3,1,2], [2,3,1,2,1,2], [1,1,2,2,3,2], [1,2,2,1,3,2], [1,2,2,2,3,1],
        [1,1,3,2,2,2], [1,2,3,1,2,2], [1,2,3,2,2,1], [2,2,3,2,1,1], [2,2,1,1,3,2],
        [2,2,1,2,3,1], [2,1,3,2,1,2], [2,2,3,1,1,2], [3,1,2,1,3,1], [3,1,1,2,2,2],
        [3,2,1,1,2,2], [3,2,1,2,2,1], [3,1,2,2,1,2], [3,2,2,1,1,2], [3,2,2,2,1,1],
        [2,1,2,1,2,3], [2,1,2,3,2,1], [2,3,2,1,2,1], [1,1,1,3,2,3], [1,3,1,1,2,3],
        [1,3,1,3,2,1], [1,1,2,3,1,3], [1,3,2,1,1,3], [1,3,2,3,1,1], [2,1,1,3,1,3],
        [2,3,1,1,1,3], [2,3,1,3,1,1], [1,1,2,1,3,3], [1,1,2,3,3,1], [1,3,2,1,3,1],
        [1,1,3,1,2,3], [1,1,3,3,2,1], [1,3,3,1,2,1], [3,1,3,1,2,1], [2,1,1,3,3,1],
        [2,3,1,1,3,1], [2,1,3,1,1,3], [2,1,3,3,1,1], [2,1,3,1,3,1], [3,1,1,1,2,3],
        [3,1,1,3,2,1], [3,3,1,1,2,1], [3,1,2,1,1,3], [3,1,2,3,1,1], [3,3,2,1,1,1],
        [3,1,4,1,1,1], [2,2,1,4,1,1], [4,3,1,1,1,1], [1,1,1,2,2,4], [1,1,1,4,2,2],
        [1,2,1,1,2,4], [1,2,1,4,2,1], [1,4,1,1,2,2], [1,4,1,2,2,1], [1,1,2,2,1,4],
        [1,1,2,4,1,2], [1,2,2,1,1,4], [1,2,2,4,1,1], [1,4,2,1,1,2], [1,4,2,2,1,1],
        [2,4,1,2,1,1], [2,2,1,1,1,4], [4,1,3,1,1,1], [2,4,1,1,1,2], [1,3,4,1,1,1],
        [1,1,1,2,4,2], [1,2,1,1,4,2], [1,2,1,2,4,1], [1,1,4,2,1,2], [1,2,4,1,1,2],
        [1,2,4,2,1,1], [4,1,1,2,1,2], [4,2,1,1,1,2], [4,2,1,2,1,1], [2,1,2,1,4,1],
        [2,1,4,1,2,1], [4,1,2,1,2,1], [1,1,1,1,4,3], [1,1,1,3,4,1], [1,3,1,1,4,1],
        [1,1,4,1,1,3], [1,1,4,3,1,1], [4,1,1,1,1,3], [4,1,1,3,1,1], [1,1,3,1,4,1],
        [1,1,4,1,3,1], [3,1,1,1,4,1], [4,1,1,1,3,1], [2,1,1,4,1,2], [2,1,1,2,1,4],
        [2,1,1,2,3,2], [2,3,3,1,1,1,2]
    ];

    const codes: number[] = [START_B];
    let sum = START_B;

    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i) - 32;
        if (code < 0 || code > 95) {
            continue;
        }
        codes.push(code);
        sum += code * (i + 1);
    }

    const checksum = sum % 103;
    codes.push(checksum);
    codes.push(STOP);

    const fullPattern: number[] = [];
    for (const c of codes) {
        if (patterns[c]) {
            fullPattern.push(...patterns[c]);
        }
    }

    return { pattern: fullPattern, checksum, valid: true };
}

function renderCode128Svg(text: string, w: number, h: number, drawText: boolean): string {
    const encoded = encodeCode128(text);
    const totalModules = encoded.pattern.reduce((a, b) => a + b, 0);

    const margin = 8;
    const textHeight = drawText ? 14 : 0;
    const barH = h - margin * 2 - textHeight;
    const scaleX = (w - margin * 2) / totalModules;

    let curX = margin;
    const rects: string[] = [];

    for (let i = 0; i < encoded.pattern.length; i++) {
        const widthMod = encoded.pattern[i] * scaleX;
        if (i % 2 === 0) {
            rects.push(`<rect x="${curX.toFixed(2)}" y="${margin}" width="${widthMod.toFixed(2)}" height="${barH.toFixed(2)}" fill="#000000"/>`);
        }
        curX += widthMod;
    }

    const textSvg = drawText ? `<text x="${(w / 2).toFixed(2)}" y="${(h - 3).toFixed(2)}" text-anchor="middle" font-family="Courier, monospace" font-size="10" fill="#000000">${escapeXml(text)}</text>` : '';

    return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#FFFFFF;">
        <rect width="${w}" height="${h}" fill="#FFFFFF"/>
        ${rects.join('')}
        ${textSvg}
    </svg>`;
}

export function calculateEan13Checksum(digits12: string): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const d = parseInt(digits12[i] || '0', 10);
        sum += i % 2 === 0 ? d : d * 3;
    }
    return (10 - (sum % 10)) % 10;
}

export function encodeEan13(rawDigits: string): { fullCode: string; bits: string; valid: boolean } {
    let digits = rawDigits.replace(/\D/g, '');
    if (digits.length < 12) {
        digits = digits.padStart(12, '0');
    }
    if (digits.length === 12) {
        const cs = calculateEan13Checksum(digits);
        digits += cs;
    } else if (digits.length > 13) {
        digits = digits.substring(0, 13);
    }

    const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    const G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
    const R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];

    const PARITY_MAP = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

    const firstDigit = parseInt(digits[0], 10);
    const parity = PARITY_MAP[firstDigit] || 'LLLLLL';

    let bits = '101';

    for (let i = 1; i <= 6; i++) {
        const d = parseInt(digits[i], 10);
        bits += parity[i - 1] === 'L' ? L_CODES[d] : G_CODES[d];
    }

    bits += '01010';

    for (let i = 7; i <= 12; i++) {
        const d = parseInt(digits[i], 10);
        bits += R_CODES[d];
    }

    bits += '101';

    return { fullCode: digits, bits, valid: true };
}

function renderEan13Svg(digits: string, w: number, h: number, drawText: boolean): string {
    const encoded = encodeEan13(digits);
    const totalModules = encoded.bits.length;

    const margin = 8;
    const textHeight = drawText ? 14 : 0;
    const barH = h - margin * 2 - textHeight;
    const scaleX = (w - margin * 2) / totalModules;

    const rects: string[] = [];
    for (let i = 0; i < encoded.bits.length; i++) {
        if (encoded.bits[i] === '1') {
            const x = margin + i * scaleX;
            rects.push(`<rect x="${x.toFixed(2)}" y="${margin}" width="${scaleX.toFixed(2)}" height="${barH.toFixed(2)}" fill="#000000"/>`);
        }
    }

    const textSvg = drawText ? `<text x="${(w / 2).toFixed(2)}" y="${(h - 3).toFixed(2)}" text-anchor="middle" font-family="Courier, monospace" font-size="10" fill="#000000">${escapeXml(encoded.fullCode)}</text>` : '';

    return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#FFFFFF;">
        <rect width="${w}" height="${h}" fill="#FFFFFF"/>
        ${rects.join('')}
        ${textSvg}
    </svg>`;
}

export function encodeCode39(text: string): { pattern: string; valid: boolean } {
    const CODE39_MAP: Record<string, string> = {
        '0': 'bwbwbwBwb', '1': 'BwbwbwbwB', '2': 'bwBwbwbwB', '3': 'BwBwbwbwb', '4': 'bwbwBwbwB',
        '5': 'BwbwBwbwb', '6': 'bwBwBwbwb', '7': 'bwbwbwBwB', '8': 'BwbwbwBwb', '9': 'bwBwbwBwb',
        'A': 'BwbwbwBwb', 'B': 'bwBwbwBwb', 'C': 'BwBwbwBwb', 'D': 'bwbwBwBwb', 'E': 'BwbwBwBwb',
        'F': 'bwBwBwBwb', 'G': 'bwbwbwBwB', 'H': 'BwbwbwBwB', 'I': 'bwBwbwBwB', 'J': 'bwbwBwBwB',
        'K': 'BwbwbwbwB', 'L': 'bwBwbwbwB', 'M': 'BwBwbwbwb', 'N': 'bwbwBwbwB', 'O': 'BwbwBwbwb',
        'P': 'bwBwBwbwb', 'Q': 'bwbwbwBwB', 'R': 'BwbwbwBwb', 'S': 'bwBwbwBwb', 'T': 'bwbwBwBwb',
        'U': 'BwBwbwbwb', 'V': 'bwBwBwbwb', 'W': 'BwBwBwbwb', 'X': 'bwbwBwBwb', 'Y': 'BwbwBwBwb',
        'Z': 'bwBwBwBwb', '-': 'bwbwbwBwB', '.': 'BwbwbwBwb', ' ': 'bwBwbwBwb', '$': 'bWbWbWbwb',
        '/': 'bWbWbwbWb', '+': 'bWbwbWbWb', '%': 'bwbWbWbWb', '*': 'bwbwBwBwb'
    };

    const clean = text.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');
    const withGuards = `*${clean}*`;

    let pattern = '';
    for (let i = 0; i < withGuards.length; i++) {
        const char = withGuards[i];
        const p = CODE39_MAP[char] || CODE39_MAP['-'];
        pattern += p + 'w';
    }

    return { pattern, valid: true };
}

function renderCode39Svg(text: string, w: number, h: number, drawText: boolean): string {
    const encoded = encodeCode39(text);
    const narrowW = 1;
    const wideW = 2.5;

    let totalWidth = 0;
    for (const ch of encoded.pattern) {
        totalWidth += (ch === 'B' || ch === 'W') ? wideW : narrowW;
    }

    const margin = 8;
    const textHeight = drawText ? 14 : 0;
    const barH = h - margin * 2 - textHeight;
    const scaleX = (w - margin * 2) / totalWidth;

    let curX = margin;
    const rects: string[] = [];

    for (const ch of encoded.pattern) {
        const isBar = (ch === 'b' || ch === 'B');
        const mWidth = (ch === 'B' || ch === 'W' ? wideW : narrowW) * scaleX;
        if (isBar) {
            rects.push(`<rect x="${curX.toFixed(2)}" y="${margin}" width="${mWidth.toFixed(2)}" height="${barH.toFixed(2)}" fill="#000000"/>`);
        }
        curX += mWidth;
    }

    const textSvg = drawText ? `<text x="${(w / 2).toFixed(2)}" y="${(h - 3).toFixed(2)}" text-anchor="middle" font-family="Courier, monospace" font-size="10" fill="#000000">${escapeXml(text)}</text>` : '';

    return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#FFFFFF;">
        <rect width="${w}" height="${h}" fill="#FFFFFF"/>
        ${rects.join('')}
        ${textSvg}
    </svg>`;
}

export function generateQrMatrix(data: string): boolean[][] {
    const size = 21;
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    function addFinder(top: number, left: number) {
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
                const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
                matrix[top + r][left + c] = isBorder || isCenter;
                reserved[top + r][left + c] = true;
            }
        }
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const tr = top + r;
                const tc = left + c;
                if (tr >= 0 && tr < size && tc >= 0 && tc < size) {
                    reserved[tr][tc] = true;
                }
            }
        }
    }

    addFinder(0, 0);
    addFinder(0, size - 7);
    addFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
        matrix[6][i] = i % 2 === 0;
        matrix[i][6] = i % 2 === 0;
        reserved[6][i] = true;
        reserved[i][6] = true;
    }

    matrix[size - 8][8] = true;
    reserved[size - 8][8] = true;

    const dataBits: number[] = [];
    dataBits.push(0, 1, 0, 0);
    const len = Math.min(data.length, 17);
    for (let i = 7; i >= 0; i--) {
        dataBits.push((len >> i) & 1);
    }
    for (let i = 0; i < len; i++) {
        const code = data.charCodeAt(i);
        for (let b = 7; b >= 0; b--) {
            dataBits.push((code >> b) & 1);
        }
    }
    while (dataBits.length < 152) {
        dataBits.push(0);
    }

    let bitIdx = 0;
    let up = true;
    for (let right = size - 1; right > 0; right -= 2) {
        if (right === 6) {right--;}
        for (let vert = 0; vert < size; vert++) {
            const r = up ? size - 1 - vert : vert;
            for (let c = right; c >= right - 1; c--) {
                if (!reserved[r][c]) {
                    const rawBit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
                    const mask = (r + c) % 2 === 0;
                    matrix[r][c] = (rawBit === 1) !== mask;
                }
            }
        }
        up = !up;
    }

    return matrix;
}

function renderQrCodeSvg(text: string, w: number, h: number, _ecc?: string): string {
    const matrix = generateQrMatrix(text);
    const matrixSize = matrix.length;
    const minDim = Math.min(w, h);
    const margin = Math.max(4, Math.floor(minDim * 0.05));
    const usableDim = minDim - margin * 2;
    const moduleSize = usableDim / matrixSize;

    const offsetX = (w - usableDim) / 2;
    const offsetY = (h - usableDim) / 2;

    const rects: string[] = [];
    for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
            if (matrix[r][c]) {
                const x = offsetX + c * moduleSize;
                const y = offsetY + r * moduleSize;
                rects.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(moduleSize + 0.1).toFixed(2)}" height="${(moduleSize + 0.1).toFixed(2)}" fill="#000000"/>`);
            }
        }
    }

    return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;background:#FFFFFF;">
        <rect width="${w}" height="${h}" fill="#FFFFFF"/>
        ${rects.join('')}
    </svg>`;
}

function escapeXml(str: string): string {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
