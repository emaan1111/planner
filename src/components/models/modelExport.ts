import { ComputedModel, FinancialModel, ModelLine, ModelHeadcount } from '@/types/models';

export function exportModelToCSV(
  model: FinancialModel,
  computed: ComputedModel,
  lines: ModelLine[],
  headcount: ModelHeadcount[],
): string {
  const rows: string[][] = [];
  const months = computed.monthLabels;

  rows.push(['Model', model.name]);
  rows.push(['Case', model.caseType]);
  rows.push(['Horizon (months)', String(model.horizonMonths)]);
  rows.push(['Start month', months[0] ?? '']);
  rows.push(['Starting cash', String(model.startingCash)]);
  rows.push(['Tax %', String(model.taxPercent)]);
  rows.push([]);

  const header = ['Line', 'Kind', 'Category', 'Mode', ...months, 'Total'];
  rows.push(header);

  for (const l of lines) {
    const arr = computed.byLine[l.id] ?? [];
    const total = arr.reduce((s, v) => s + v, 0);
    rows.push([
      l.name,
      l.kind,
      l.category ?? '',
      l.inputMode,
      ...arr.map((v) => v.toFixed(2)),
      total.toFixed(2),
    ]);
  }
  for (const h of headcount) {
    const arr = computed.payrollByPerson[h.id] ?? [];
    const total = arr.reduce((s, v) => s + v, 0);
    rows.push([
      h.name,
      'cost',
      'Payroll',
      'headcount',
      ...arr.map((v) => v.toFixed(2)),
      total.toFixed(2),
    ]);
  }
  rows.push(['Tax', 'cost', 'Tax', 'auto', ...computed.taxPerMonth.map((v) => v.toFixed(2)), computed.taxPerMonth.reduce((s, v) => s + v, 0).toFixed(2)]);
  rows.push([]);
  rows.push(['Total revenue', '', '', '', ...computed.totalRevenue.map((v) => v.toFixed(2)), computed.totalRevenue.reduce((s, v) => s + v, 0).toFixed(2)]);
  rows.push(['Total cost', '', '', '', ...computed.totalCost.map((v) => v.toFixed(2)), computed.totalCost.reduce((s, v) => s + v, 0).toFixed(2)]);
  rows.push(['Profit', '', '', '', ...computed.profit.map((v) => v.toFixed(2)), computed.profit.reduce((s, v) => s + v, 0).toFixed(2)]);
  rows.push(['Cumulative cash', '', '', '', ...computed.cumulativeCash.map((v) => v.toFixed(2)), (computed.cumulativeCash[computed.cumulativeCash.length - 1] ?? 0).toFixed(2)]);

  return rows
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
