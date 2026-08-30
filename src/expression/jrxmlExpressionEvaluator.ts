import { EvaluationContext } from './jrxmlEvaluationContext';
import { EvaluationResult, EvaluationStatus } from './jrxmlExpressionModel';

export function evaluateExpression(
    expressionStr: string | undefined,
    context: EvaluationContext,
    pattern?: string
): EvaluationResult {
    if (expressionStr === undefined || expressionStr === null) {
        return {
            status: 'RESOLVED',
            value: '',
            displayValue: '',
            rawExpression: ''
        };
    }

    const raw = expressionStr.trim();
    if (raw.length === 0) {
        return {
            status: 'RESOLVED',
            value: '',
            displayValue: '',
            rawExpression: raw
        };
    }

    try {
        const evalResult = evaluateAstOrTokens(raw, context);
        const formattedDisplay = formatValueWithPattern(evalResult.value, pattern);

        return {
            status: evalResult.status,
            value: evalResult.value,
            displayValue: evalResult.status === 'RESOLVED' ? formattedDisplay : raw,
            rawExpression: raw,
            errorMessage: evalResult.errorMessage
        };
    } catch (err) {
        return {
            status: 'ERROR',
            value: undefined,
            displayValue: raw,
            rawExpression: raw,
            errorMessage: (err as Error).message
        };
    }
}

interface IntermediateResult {
    status: EvaluationStatus;
    value: any;
    errorMessage?: string;
}

function evaluateAstOrTokens(expr: string, context: EvaluationContext): IntermediateResult {
    const trimmed = expr.trim();

    if (trimmed.includes('SimpleDateFormat(') && trimmed.includes('.format(')) {
        const sdfRes = evaluateSimpleDateFormat(trimmed, context);
        if (sdfRes.status === 'RESOLVED') {
            return sdfRes;
        }
    }

    const ternaryMatch = matchTernary(trimmed);
    if (ternaryMatch) {
        const condResult = evaluateCondition(ternaryMatch.condition, context);
        if (condResult.status !== 'RESOLVED') {
            return condResult;
        }
        if (condResult.value) {
            return evaluateAstOrTokens(ternaryMatch.trueBranch, context);
        } else {
            return evaluateAstOrTokens(ternaryMatch.falseBranch, context);
        }
    }

    const comparisonMatch = matchComparison(trimmed);
    if (comparisonMatch) {
        return evaluateComparison(comparisonMatch, context);
    }

    if (trimmed.includes('.equals(')) {
        const eqMatch = trimmed.match(/^([\s\S]+?)\.equals\(\s*([\s\S]+?)\s*\)$/);
        if (eqMatch) {
            const leftRes = evaluateAstOrTokens(eqMatch[1], context);
            const rightRes = evaluateAstOrTokens(eqMatch[2], context);
            if (leftRes.status === 'RESOLVED' && rightRes.status === 'RESOLVED') {
                return { status: 'RESOLVED', value: leftRes.value === rightRes.value };
            }
            return { status: leftRes.status !== 'RESOLVED' ? leftRes.status : rightRes.status, value: false };
        }
    }

    const concatParts = splitTopLevelBinary(trimmed, '+');
    if (concatParts.length > 1) {
        let hasString = false;
        let isMissing = false;
        let isUnsupported = false;
        const evaluatedParts: any[] = [];

        for (const part of concatParts) {
            const res = evaluateAstOrTokens(part, context);
            if (res.status === 'MISSING') {isMissing = true;}
            if (res.status === 'UNSUPPORTED') {isUnsupported = true;}
            if (typeof res.value === 'string' || part.startsWith('"') || part.startsWith("'")) {
                hasString = true;
            }
            evaluatedParts.push(res.value);
        }

        if (isUnsupported) {
            return { status: 'UNSUPPORTED', value: undefined };
        }
        if (isMissing) {
            return { status: 'MISSING', value: undefined };
        }

        if (hasString) {
            const strVal = evaluatedParts.map(p => (p !== undefined && p !== null ? String(p) : '')).join('');
            return { status: 'RESOLVED', value: strVal };
        } else {
            const numSum = evaluatedParts.reduce((acc, p) => acc + (typeof p === 'number' ? p : parseFloat(p || 0)), 0);
            return { status: 'RESOLVED', value: numSum };
        }
    }

    return evaluateAtom(trimmed, context);
}

function evaluateAtom(atom: string, context: EvaluationContext): IntermediateResult {
    const trimmed = atom.trim();

    const pMatch = trimmed.match(/^\$P\{([^}]+)\}$/);
    if (pMatch) {
        const name = pMatch[1];
        if (context.parameters && Object.prototype.hasOwnProperty.call(context.parameters, name)) {
            return { status: 'RESOLVED', value: context.parameters[name] };
        }
        return { status: 'MISSING', value: undefined, errorMessage: `Parameter $P{${name}} not found in context` };
    }

    const fMatch = trimmed.match(/^\$F\{([^}]+)\}$/);
    if (fMatch) {
        const name = fMatch[1];
        if (context.fields && Object.prototype.hasOwnProperty.call(context.fields, name)) {
            return { status: 'RESOLVED', value: context.fields[name] };
        }
        return { status: 'MISSING', value: undefined, errorMessage: `Field $F{${name}} not found in context` };
    }

    const vMatch = trimmed.match(/^\$V\{([^}]+)\}$/);
    if (vMatch) {
        const name = vMatch[1];
        if (context.variables && Object.prototype.hasOwnProperty.call(context.variables, name)) {
            return { status: 'RESOLVED', value: context.variables[name] };
        }
        return { status: 'MISSING', value: undefined, errorMessage: `Variable $V{${name}} not found in context` };
    }

    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        const unquoted = trimmed.substring(1, trimmed.length - 1);
        return { status: 'RESOLVED', value: unquoted };
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return { status: 'RESOLVED', value: parseFloat(trimmed) };
    }

    if (trimmed === 'true' || trimmed === 'Boolean.TRUE') {
        return { status: 'RESOLVED', value: true };
    }
    if (trimmed === 'false' || trimmed === 'Boolean.FALSE') {
        return { status: 'RESOLVED', value: false };
    }
    if (trimmed === 'null') {
        return { status: 'RESOLVED', value: null };
    }

    if (trimmed.startsWith('Integer.valueOf(') && trimmed.endsWith(')')) {
        const inner = trimmed.substring('Integer.valueOf('.length, trimmed.length - 1).trim();
        const num = parseInt(inner, 10);
        return { status: 'RESOLVED', value: isNaN(num) ? 0 : num };
    }

    if (trimmed.startsWith('new java.util.Date()')) {
        return { status: 'RESOLVED', value: new Date() };
    }
    if (trimmed.startsWith('new java.util.Date(') && trimmed.endsWith(')')) {
        const inner = trimmed.substring('new java.util.Date('.length, trimmed.length - 1).replace(/L$/i, '').trim();
        const num = parseInt(inner, 10);
        return { status: 'RESOLVED', value: isNaN(num) ? new Date() : new Date(num) };
    }

    return { status: 'UNSUPPORTED', value: undefined, errorMessage: `Unsupported expression syntax: ${trimmed}` };
}

function evaluateSimpleDateFormat(expr: string, context: EvaluationContext): IntermediateResult {
    const match = expr.match(/(?:\(?\s*new\s+(?:java\.text\.)?SimpleDateFormat\(\s*["']([^"']+)["']\s*\)\s*\)?)\.format\(\s*([\s\S]+?)\s*\)/);
    if (!match) {
        return { status: 'UNSUPPORTED', value: undefined };
    }

    const pattern = match[1];
    const argExpr = match[2];
    const argResult = evaluateAstOrTokens(argExpr, context);

    if (argResult.status !== 'RESOLVED') {
        return argResult;
    }

    const formatted = formatValueWithPattern(argResult.value, pattern);
    return { status: 'RESOLVED', value: formatted };
}

interface TernaryMatch {
    condition: string;
    trueBranch: string;
    falseBranch: string;
}

function matchTernary(expr: string): TernaryMatch | null {
    let questionIndex = -1;
    let colonIndex = -1;
    let parenDepth = 0;
    let inString = false;
    let quoteChar = '';

    for (let i = 0; i < expr.length; i++) {
        const char = expr[i];

        if (inString) {
            if (char === quoteChar && expr[i - 1] !== '\\') {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            quoteChar = char;
            continue;
        }

        if (char === '(' || char === '{' || char === '[') {
            parenDepth++;
            continue;
        }
        if (char === ')' || char === '}' || char === ']') {
            parenDepth--;
            continue;
        }

        if (parenDepth === 0) {
            if (char === '?' && questionIndex === -1) {
                questionIndex = i;
            } else if (char === ':' && questionIndex !== -1 && colonIndex === -1) {
                colonIndex = i;
                break;
            }
        }
    }

    if (questionIndex !== -1 && colonIndex !== -1 && questionIndex < colonIndex) {
        return {
            condition: expr.substring(0, questionIndex).trim(),
            trueBranch: expr.substring(questionIndex + 1, colonIndex).trim(),
            falseBranch: expr.substring(colonIndex + 1).trim()
        };
    }

    return null;
}

function evaluateCondition(cond: string, context: EvaluationContext): IntermediateResult {
    const trimmed = cond.trim();

    if (trimmed.includes('.equals(')) {
        const eqMatch = trimmed.match(/^([\s\S]+?)\.equals\(\s*([\s\S]+?)\s*\)$/);
        if (eqMatch) {
            const leftRes = evaluateAstOrTokens(eqMatch[1], context);
            const rightRes = evaluateAstOrTokens(eqMatch[2], context);
            if (leftRes.status === 'RESOLVED' && rightRes.status === 'RESOLVED') {
                return { status: 'RESOLVED', value: leftRes.value === rightRes.value };
            }
            return { status: leftRes.status !== 'RESOLVED' ? leftRes.status : rightRes.status, value: false };
        }
    }

    const compMatch = matchComparison(trimmed);
    if (compMatch) {
        return evaluateComparison(compMatch, context);
    }

    return evaluateAstOrTokens(trimmed, context);
}

interface ComparisonMatch {
    left: string;
    op: string;
    right: string;
}

function matchComparison(expr: string): ComparisonMatch | null {
    const ops = ['==', '!=', '<=', '>=', '<', '>'];
    let inString = false;
    let quoteChar = '';
    let parenDepth = 0;

    for (let i = 0; i < expr.length; i++) {
        const char = expr[i];

        if (inString) {
            if (char === quoteChar && expr[i - 1] !== '\\') {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            quoteChar = char;
            continue;
        }

        if (char === '(' || char === '{' || char === '[') {
            parenDepth++;
            continue;
        }
        if (char === ')' || char === '}' || char === ']') {
            parenDepth--;
            continue;
        }

        if (parenDepth === 0) {
            for (const op of ops) {
                if (expr.substring(i, i + op.length) === op) {
                    return {
                        left: expr.substring(0, i).trim(),
                        op,
                        right: expr.substring(i + op.length).trim()
                    };
                }
            }
        }
    }
    return null;
}

function evaluateComparison(comp: ComparisonMatch, context: EvaluationContext): IntermediateResult {
    const leftRes = evaluateAstOrTokens(comp.left, context);
    const rightRes = evaluateAstOrTokens(comp.right, context);

    if (leftRes.status === 'MISSING' || rightRes.status === 'MISSING') {
        return { status: 'MISSING', value: false };
    }
    if (leftRes.status === 'UNSUPPORTED' || rightRes.status === 'UNSUPPORTED') {
        return { status: 'UNSUPPORTED', value: false };
    }

    const l = leftRes.value;
    const r = rightRes.value;

    switch (comp.op) {
        case '==': return { status: 'RESOLVED', value: l === r };
        case '!=': return { status: 'RESOLVED', value: l !== r };
        case '<': return { status: 'RESOLVED', value: l < r };
        case '>': return { status: 'RESOLVED', value: l > r };
        case '<=': return { status: 'RESOLVED', value: l <= r };
        case '>=': return { status: 'RESOLVED', value: l >= r };
        default: return { status: 'UNSUPPORTED', value: false };
    }
}

function splitTopLevelBinary(expr: string, operator: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inString = false;
    let quoteChar = '';
    let parenDepth = 0;

    for (let i = 0; i < expr.length; i++) {
        const char = expr[i];

        if (inString) {
            current += char;
            if (char === quoteChar && expr[i - 1] !== '\\') {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            quoteChar = char;
            current += char;
            continue;
        }

        if (char === '(' || char === '{' || char === '[') {
            parenDepth++;
            current += char;
            continue;
        }
        if (char === ')' || char === '}' || char === ']') {
            parenDepth--;
            current += char;
            continue;
        }

        if (parenDepth === 0 && char === operator) {
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim().length > 0) {
        parts.push(current.trim());
    }

    return parts;
}

export function formatValueWithPattern(value: any, pattern?: string): string {
    if (value === undefined || value === null) {
        return '';
    }

    if (!pattern || pattern.trim().length === 0) {
        if (value instanceof Date) {
            return value.toISOString().split('T')[0];
        }
        return String(value);
    }

    const pat = pattern.trim();

    if (value instanceof Date) {
        return formatDateWithPattern(value, pat);
    }

    if (typeof value === 'number') {
        return formatNumberWithPattern(value, pat);
    }

    const num = parseFloat(String(value));
    if (!isNaN(num) && (pat.includes('#') || pat.includes('0') || pat.includes('$'))) {
        return formatNumberWithPattern(num, pat);
    }

    return String(value);
}

function formatDateWithPattern(date: Date, pattern: string): string {
    const year = date.getUTCFullYear() || date.getFullYear();
    const month = String((date.getUTCMonth() !== undefined ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
    const day = String(date.getUTCDate() || date.getDate()).padStart(2, '0');
    const hours = String(date.getUTCHours() || date.getHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes() || date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds() || date.getSeconds()).padStart(2, '0');

    let res = pattern;
    res = res.replace(/yyyy/g, String(year));
    res = res.replace(/yy/g, String(year).substring(2));
    res = res.replace(/MM/g, month);
    res = res.replace(/dd/g, day);
    res = res.replace(/HH/g, hours);
    res = res.replace(/mm/g, minutes);
    res = res.replace(/ss/g, seconds);
    return res;
}

function formatNumberWithPattern(num: number, pattern: string): string {
    const isCurrency = pattern.includes('$');
    const hasDecimal = pattern.includes('.');
    const decimalPlaces = hasDecimal ? (pattern.split('.')[1].match(/0/g) || []).length : 0;
    const hasGrouping = pattern.includes(',');

    let fixed = num.toFixed(decimalPlaces > 0 ? decimalPlaces : 0);
    let [intPart, decPart] = fixed.split('.');

    if (hasGrouping) {
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    let result = decPart ? `${intPart}.${decPart}` : intPart;
    if (isCurrency) {
        result = `$ ${result}`;
    }
    return result;
}
