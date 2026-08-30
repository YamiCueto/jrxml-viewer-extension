export type EvaluationStatus = 'RESOLVED' | 'MISSING' | 'UNSUPPORTED' | 'ERROR';

export interface EvaluationResult {
    status: EvaluationStatus;
    value: any;
    displayValue: string;
    rawExpression: string;
    errorMessage?: string;
}

export type DatasetRow = Record<string, any>;

export interface PreviewDataset {
    parameters: Record<string, any>;
    rows: DatasetRow[];
    variables: Record<string, any>;
}
