export type HistoryRecord = { visitor: string; date: string; course: string };
export type HistoryData = { source: 'nginx-history'; importedAt: string; start: string; end: string; records: HistoryRecord[] };
