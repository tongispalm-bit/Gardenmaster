const STORAGE_KEYS = {
  careRecords: 'garden_master_care_records',
  transactions: 'garden_master_transactions',
};

export type CareRecord = {
  id: string;
  date: string;
  type: 'water' | 'fertilize' | 'pesticide';
  plant: string;
  note: string;
  createdAt: number;
};

export type Transaction = {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  createdAt: number;
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function addCareRecord(record: Omit<CareRecord, 'id'>): Promise<string> {
  const records = await getCareRecords();
  const newRecord = { ...record, id: generateId() };
  records.unshift(newRecord);
  localStorage.setItem(STORAGE_KEYS.careRecords, JSON.stringify(records));
  return newRecord.id;
}

export async function getCareRecords(): Promise<CareRecord[]> {
  const data = localStorage.getItem(STORAGE_KEYS.careRecords);
  return data ? JSON.parse(data) : [];
}

export async function deleteCareRecord(id: string): Promise<void> {
  const records = await getCareRecords();
  const filtered = records.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.careRecords, JSON.stringify(filtered));
}

export async function addTransaction(record: Omit<Transaction, 'id'>): Promise<string> {
  const transactions = await getTransactions();
  const newRecord = { ...record, id: generateId() };
  transactions.unshift(newRecord);
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  return newRecord.id;
}

export async function getTransactions(): Promise<Transaction[]> {
  const data = localStorage.getItem(STORAGE_KEYS.transactions);
  return data ? JSON.parse(data) : [];
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = await getTransactions();
  const filtered = transactions.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(filtered));
}
