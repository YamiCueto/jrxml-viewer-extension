import { JrxmlDocument, JrxmlVariable } from '../model/jrxmlDocumentModel';
import { PreviewDataset, DatasetRow } from './jrxmlExpressionModel';

export interface EvaluationContext {
    parameters: Record<string, any>;
    fields: Record<string, any>;
    variables: Record<string, any>;
}

export function createDefaultPreviewDataset(doc?: JrxmlDocument): PreviewDataset {
    const params: Record<string, any> = {
        ReportTitle: 'Enterprise Sales & Customer Performance Summary',
        CompanyCode: 'CORP-HQ-001',
        ExportUser: 'System.Auditor',
        DepartmentFilter: 'All Departments',
        FiscalYear: 2026,
        MinOrderQuantity: 1,
        StartDate: new Date('2026-01-01T00:00:00Z'),
        EndDate: new Date('2026-12-31T23:59:59Z'),
        ShowSummaryCharts: true,
        IncludeDiscounts: true
    };

    if (doc?.report?.parameters) {
        for (const p of doc.report.parameters) {
            if (params[p.name] === undefined && p.defaultValueExpression) {
                params[p.name] = p.defaultValueExpression.raw;
            }
        }
    }

    const rows: DatasetRow[] = [
        {
            transactionId: 1001,
            customerId: 'CUST-001',
            customerName: 'Acme Global Corp',
            region: 'North America',
            productCategory: 'Enterprise Software',
            orderStatus: 'COMPLETED',
            orderQuantity: 5,
            loyaltyPoints: 120,
            unitPrice: 1200.0,
            discountAmount: 150.0,
            taxAmount: 85.0,
            totalAmount: 5935.0,
            orderDate: new Date('2026-02-15'),
            shippingDate: new Date('2026-02-18'),
            isVipCustomer: true,
            isDelivered: true
        },
        {
            transactionId: 1002,
            customerId: 'CUST-002',
            customerName: 'Starlight Retailers',
            region: 'North America',
            productCategory: 'Hardware Systems',
            orderStatus: 'COMPLETED',
            orderQuantity: 2,
            loyaltyPoints: 45,
            unitPrice: 850.0,
            discountAmount: 0.0,
            taxAmount: 50.0,
            totalAmount: 1750.0,
            orderDate: new Date('2026-03-10'),
            shippingDate: new Date('2026-03-12'),
            isVipCustomer: false,
            isDelivered: true
        },
        {
            transactionId: 1003,
            customerId: 'CUST-003',
            customerName: 'Vanguard Logistics',
            region: 'EMEA',
            productCategory: 'Cloud Services',
            orderStatus: 'PENDING',
            orderQuantity: 10,
            loyaltyPoints: 300,
            unitPrice: 450.0,
            discountAmount: 200.0,
            taxAmount: 180.0,
            totalAmount: 4480.0,
            orderDate: new Date('2026-04-05'),
            shippingDate: new Date('2026-04-10'),
            isVipCustomer: true,
            isDelivered: false
        }
    ];

    const variables: Record<string, any> = doc ? calculateAggregatedVariables(doc, rows) : {
        totalTransactionsCount: rows.length,
        grandTotalAmount: 12165.0,
        grandTotalDiscounts: 350.0,
        PAGE_NUMBER: 1,
        REPORT_COUNT: rows.length
    };

    return {
        parameters: params,
        rows,
        variables
    };
}

export function calculateAggregatedVariables(
    doc: JrxmlDocument,
    rows: DatasetRow[],
    filterGroupField?: string,
    filterGroupValue?: any
): Record<string, any> {
    const activeRows = filterGroupField && filterGroupValue !== undefined
        ? rows.filter(r => r[filterGroupField] === filterGroupValue)
        : rows;

    const result: Record<string, any> = {
        PAGE_NUMBER: 1,
        REPORT_COUNT: activeRows.length
    };

    for (const v of doc.report.variables) {
        const fieldName = extractFieldNameFromExpression(v.expression?.raw);

        if (v.calculation === 'Count') {
            result[v.name] = activeRows.length;
        } else if (v.calculation === 'Sum') {
            if (fieldName) {
                const sum = activeRows.reduce((acc, r) => {
                    const val = typeof r[fieldName] === 'number' ? r[fieldName] : parseFloat(r[fieldName] || '0');
                    return acc + (isNaN(val) ? 0 : val);
                }, 0);
                result[v.name] = sum;
            } else {
                result[v.name] = 0;
            }
        } else if (v.calculation === 'Average') {
            if (fieldName && activeRows.length > 0) {
                const sum = activeRows.reduce((acc, r) => {
                    const val = typeof r[fieldName] === 'number' ? r[fieldName] : parseFloat(r[fieldName] || '0');
                    return acc + (isNaN(val) ? 0 : val);
                }, 0);
                result[v.name] = sum / activeRows.length;
            } else {
                result[v.name] = 0;
            }
        } else {
            if (fieldName && activeRows.length > 0) {
                result[v.name] = activeRows[0][fieldName];
            } else {
                result[v.name] = v.name;
            }
        }
    }

    return result;
}

function extractFieldNameFromExpression(raw?: string): string | null {
    if (!raw) {return null;}
    const match = raw.trim().match(/^\$F\{([^}]+)\}$/);
    return match ? match[1] : null;
}

export function createEvaluationContext(
    dataset: PreviewDataset,
    rowOrIndex?: DatasetRow | number,
    variablesOverride?: Record<string, any>
): EvaluationContext {
    let fields: Record<string, any> = {};

    if (typeof rowOrIndex === 'number') {
        fields = dataset.rows[rowOrIndex] || {};
    } else if (rowOrIndex && typeof rowOrIndex === 'object') {
        fields = rowOrIndex;
    } else if (dataset.rows.length > 0) {
        fields = dataset.rows[0];
    }

    const variables = {
        ...dataset.variables,
        ...(variablesOverride || {})
    };

    return {
        parameters: { ...dataset.parameters },
        fields: { ...fields },
        variables
    };
}
