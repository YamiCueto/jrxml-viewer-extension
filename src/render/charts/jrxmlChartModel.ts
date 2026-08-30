export interface ChartCategoryItem {
    category: string;
    value: number;
    formattedValue?: string;
    seriesName?: string;
}

export interface ChartSeries {
    name: string;
    items: ChartCategoryItem[];
    color: string;
}

export interface ChartPieSlice {
    label: string;
    value: number;
    percentage: number;
    color: string;
    startAngle: number;
    endAngle: number;
}

export interface ResolvedChartData {
    chartType: 'barChart' | 'pieChart' | 'lineChart' | string;
    title?: string;
    subtitle?: string;
    series: ChartSeries[];
    pieSlices: ChartPieSlice[];
    categories: string[];
    minValue: number;
    maxValue: number;
    totalValue: number;
    legend?: {
        textColor?: string;
        backgroundColor?: string;
    };
}
