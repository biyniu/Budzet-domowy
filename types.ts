
export interface AccountBalance {
    bank: number;
    cash: number;
}

export type MoneySource = 'bank' | 'cash';

export interface FixedExpense {
    id: string;
    name: string;
    amount: number;
    isPaid: boolean;
    source: MoneySource;
}

export interface EnvelopeTransaction {
    id: string;
    envelopeId: string;
    type: 'in' | 'out'; // in = zasilenie, out = wydatek
    amount: number;
    date: string;
    note?: string;
}

export interface Envelope {
    id: string;
    name: string;
    allocated: number; // How much money is currently inside
    description?: string;
    icon?: string;
}

export interface ExpenseRecord {
    id: string;
    amount: number;
    category: string;
    date: string; // ISO string
    source: MoneySource;
    note?: string;
}

export interface Category {
    id: string;
    label: string;
    color: string;
}

export type ViewState = 'dashboard' | 'fixed' | 'envelopes' | 'expenses' | 'history' | 'settings';

export interface AppState {
    balance: AccountBalance;
    fixedExpenses: FixedExpense[];
    envelopes: Envelope[];
    envelopeTransactions: EnvelopeTransaction[];
    expenses: ExpenseRecord[];
    categories: Category[]; // New: Dynamic categories
    settings: {
        payday: number; // Day of month (1-31)
        lastResetDate: string;
    };
}
