import { JrxmlElement } from '../../model/jrxmlDocumentModel';
import { PreviewDataset, DatasetRow } from '../../expression/jrxmlExpressionModel';
import { EvaluationContext, createEvaluationContext } from '../../expression/jrxmlEvaluationContext';
import { evaluateExpression } from '../../expression/jrxmlExpressionEvaluator';
import { ResolvedChartData, ChartSeries, ChartCategoryItem, ChartPieSlice } from './jrxmlChartModel';

const DEFAULT_PALETTE = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#6366F1'
];

export function resolveChartData(
    element: JrxmlElement,
    dataset: PreviewDataset,
    context?: EvaluationContext
): ResolvedChartData {
    const chartType = element.chartType || 'barChart';
    const title = element.chartTitle;
    const subtitle = element.chartSubtitle;
    const legend = element.legend;

    if (chartType === 'pieChart') {
        return resolvePieChartData(element, dataset, title, subtitle, legend, context);
    } else {
        return resolveCategoryChartData(element, dataset, chartType, title, subtitle, legend, context);
    }
}

function resolvePieChartData(
    element: JrxmlElement,
    dataset: PreviewDataset,
    title?: string,
    subtitle?: string,
    legend?: { textColor?: string; backgroundColor?: string },
    context?: EvaluationContext
): ResolvedChartData {
    const pieSlices: ChartPieSlice[] = [];
    const catMap = new Map<string, number>();

    if (element.pieDataset && dataset.rows.length > 0) {
        const keyExpr = element.pieDataset.keyExpression?.raw;
        const valExpr = element.pieDataset.valueExpression?.raw;

        for (const row of dataset.rows) {
            const rowCtx = createEvaluationContext(dataset, row);
            const keyRes = keyExpr ? evaluateExpression(keyExpr, rowCtx) : { value: 'Item' };
            const valRes = valExpr ? evaluateExpression(valExpr, rowCtx) : { value: 1 };

            const keyStr = String(keyRes.value !== undefined && keyRes.value !== null ? keyRes.value : 'Unknown');
            const numVal = typeof valRes.value === 'number' ? valRes.value : parseFloat(String(valRes.value)) || 0;

            catMap.set(keyStr, (catMap.get(keyStr) || 0) + numVal);
        }
    } else if (dataset.rows.length > 0) {
        for (const row of dataset.rows) {
            const keyStr = String(row.orderStatus || row.region || 'Item');
            const numVal = typeof row.totalAmount === 'number' ? row.totalAmount : 1;
            catMap.set(keyStr, (catMap.get(keyStr) || 0) + numVal);
        }
    }

    let totalValue = 0;
    for (const val of catMap.values()) {
        totalValue += val;
    }

    let currentAngle = 0;
    let sliceIdx = 0;
    const categories: string[] = [];

    for (const [key, val] of catMap.entries()) {
        categories.push(key);
        const percentage = totalValue > 0 ? (val / totalValue) * 100 : 0;
        const angle = totalValue > 0 ? (val / totalValue) * 360 : 0;
        const color = DEFAULT_PALETTE[sliceIdx % DEFAULT_PALETTE.length];

        pieSlices.push({
            label: key,
            value: val,
            percentage,
            color,
            startAngle: currentAngle,
            endAngle: currentAngle + angle
        });

        currentAngle += angle;
        sliceIdx++;
    }

    return {
        chartType: 'pieChart',
        title,
        subtitle,
        series: [],
        pieSlices,
        categories,
        minValue: 0,
        maxValue: totalValue,
        totalValue,
        legend
    };
}

function resolveCategoryChartData(
    element: JrxmlElement,
    dataset: PreviewDataset,
    chartType: string,
    title?: string,
    subtitle?: string,
    legend?: { textColor?: string; backgroundColor?: string },
    context?: EvaluationContext
): ResolvedChartData {
    const seriesList: ChartSeries[] = [];
    const categoryOrder: string[] = [];
    let globalMax = 0;
    let totalVal = 0;

    if (element.categoryDataset?.series && element.categoryDataset.series.length > 0 && dataset.rows.length > 0) {
        let sIdx = 0;
        for (const s of element.categoryDataset.series) {
            let sName = 'Series';
            if (s.seriesExpression?.raw) {
                const sNameRes = evaluateExpression(s.seriesExpression.raw, context || createEvaluationContext(dataset));
                sName = String(sNameRes.value || sNameRes.displayValue || 'Series');
            }

            const catExpr = s.categoryExpression?.raw;
            const valExpr = s.valueExpression?.raw;
            const catMap = new Map<string, number>();

            for (const row of dataset.rows) {
                const rowCtx = createEvaluationContext(dataset, row);
                const catRes = catExpr ? evaluateExpression(catExpr, rowCtx) : { value: 'Item' };
                const valRes = valExpr ? evaluateExpression(valExpr, rowCtx) : { value: 0 };

                let catStr = 'Item';
                if (catRes.value instanceof Date) {
                    const m = catRes.value.getUTCMonth() + 1;
                    const d = catRes.value.getUTCDate();
                    catStr = `${catRes.value.getUTCFullYear()}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
                } else if (catRes.value !== undefined && catRes.value !== null) {
                    catStr = String(catRes.value);
                }

                const numVal = typeof valRes.value === 'number' ? valRes.value : parseFloat(String(valRes.value)) || 0;

                if (!catMap.has(catStr) && !categoryOrder.includes(catStr)) {
                    categoryOrder.push(catStr);
                }
                catMap.set(catStr, (catMap.get(catStr) || 0) + numVal);
                totalVal += numVal;
            }

            const items: ChartCategoryItem[] = [];
            for (const cat of categoryOrder) {
                const v = catMap.get(cat) || 0;
                if (v > globalMax) {globalMax = v;}
                items.push({
                    category: cat,
                    value: v,
                    seriesName: sName
                });
            }

            seriesList.push({
                name: sName,
                items,
                color: DEFAULT_PALETTE[sIdx % DEFAULT_PALETTE.length]
            });
            sIdx++;
        }
    } else if (dataset.rows.length > 0) {
        const catMap = new Map<string, number>();
        for (const row of dataset.rows) {
            const catStr = String(row.region || row.productCategory || 'Item');
            const numVal = typeof row.totalAmount === 'number' ? row.totalAmount : 0;
            if (!categoryOrder.includes(catStr)) {categoryOrder.push(catStr);}
            catMap.set(catStr, (catMap.get(catStr) || 0) + numVal);
            totalVal += numVal;
            if (numVal > globalMax) {globalMax = numVal;}
        }

        const items: ChartCategoryItem[] = categoryOrder.map(cat => ({
            category: cat,
            value: catMap.get(cat) || 0,
            seriesName: 'Sales'
        }));

        seriesList.push({
            name: 'Sales',
            items,
            color: DEFAULT_PALETTE[0]
        });
    }

    return {
        chartType,
        title,
        subtitle,
        series: seriesList,
        pieSlices: [],
        categories: categoryOrder,
        minValue: 0,
        maxValue: globalMax > 0 ? globalMax : 100,
        totalValue: totalVal,
        legend
    };
}
