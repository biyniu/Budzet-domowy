
import React, { useState, useMemo } from 'react';
import { ExpenseRecord, IncomeRecord, Category, MoneySource } from '../types';
import { Icons } from '../constants';

interface HistoryProps {
    expenses: ExpenseRecord[];
    incomes: IncomeRecord[];
    categories: Category[];
    payday: number;
    onEditExpense: (id: string, amount: number, category: string, note: string, source: MoneySource) => void;
    onDeleteExpense: (id: string) => void;
    onEditIncome: (id: string, amount: number, source: MoneySource, date: string) => void;
    onDeleteIncome: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ 
    expenses, 
    incomes, 
    categories, 
    payday,
    onEditExpense,
    onDeleteExpense,
    onEditIncome,
    onDeleteIncome
}) => {
    // Editing State
    const [editingItem, setEditingItem] = useState<{ type: 'expense' | 'income', data: ExpenseRecord | IncomeRecord } | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editCategory, setEditCategory] = useState(''); // Only for expenses
    const [editNote, setEditNote] = useState(''); // Only for expenses
    const [editSource, setEditSource] = useState<MoneySource>('bank');
    const [editDate, setEditDate] = useState('');

    const openEdit = (type: 'expense' | 'income', item: ExpenseRecord | IncomeRecord) => {
        setEditingItem({ type, data: item });
        setEditAmount(item.amount.toString());
        setEditSource(item.source);
        setEditDate(item.date.split('T')[0]); // ISO string to YYYY-MM-DD
        
        if (type === 'expense') {
            const exp = item as ExpenseRecord;
            setEditCategory(exp.category);
            setEditNote(exp.note || '');
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        const val = parseFloat(editAmount.replace(',', '.').replace(/\s/g, ''));
        if (isNaN(val) || val <= 0) return;

        if (editingItem.type === 'expense') {
            onEditExpense(editingItem.data.id, val, editCategory, editNote, editSource);
        } else {
            // Reconstruct ISO date, preserving time if possible or just date
            const newDate = new Date(editDate).toISOString();
            onEditIncome(editingItem.data.id, val, editSource, newDate);
        }
        setEditingItem(null);
    };

    // Generate list of months available in history
    const getPeriodKey = (dateStr: string): string => {
        const d = new Date(dateStr);
        let year = d.getFullYear();
        let month = d.getMonth(); // 0-11
        
        if (d.getDate() < payday) {
            month--;
            if (month < 0) {
                month = 11;
                year--;
            }
        }
        // Return ISO string of the START of the period
        return new Date(year, month, payday).toISOString();
    };

    // Combine dates from both expenses and incomes to find all active periods
    const allDates = [
        ...expenses.map(e => e.date),
        ...incomes.map(i => i.date)
    ];

    const periods: string[] = Array.from<string>(new Set(allDates.map(d => getPeriodKey(d)))).sort().reverse();
    
    // Default to latest period or current
    const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || getPeriodKey(new Date().toISOString()));

    const formatPeriodLabel = (isoDate: string) => {
        const start = new Date(isoDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        
        return `${start.toLocaleDateString('pl-PL')} - ${end.toLocaleDateString('pl-PL')}`;
    };

    // Filter Data
    const filteredExpenses = expenses.filter(e => getPeriodKey(e.date) === selectedPeriod).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const filteredIncomes = incomes.filter(i => getPeriodKey(i.date) === selectedPeriod).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    // Calculate Breakdown (Expenses only)
    const breakdown = filteredExpenses.reduce((acc, curr) => {
        const catId = curr.category;
        if (!acc[catId]) acc[catId] = 0;
        acc[catId] += curr.amount;
        return acc;
    }, {} as Record<string, number>);

    // --- CHART LOGIC: Daily Income & Expense Breakdown for Selected Period ---
    const chartData = useMemo(() => {
        const data: { day: string; income: number; expense: number; dateObj: Date }[] = [];
        
        const start = new Date(selectedPeriod);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        // Map existing incomes
        const incomeMap: Record<string, number> = {};
        filteredIncomes.forEach(inc => {
            const dKey = new Date(inc.date).toDateString();
            incomeMap[dKey] = (incomeMap[dKey] || 0) + inc.amount;
        });

        // Map existing expenses
        const expenseMap: Record<string, number> = {};
        filteredExpenses.forEach(exp => {
            const dKey = new Date(exp.date).toDateString();
            expenseMap[dKey] = (expenseMap[dKey] || 0) + exp.amount;
        });

        // Iterate through every day of the billing period
        let curr = new Date(start);
        while (curr < end) {
            const dKey = curr.toDateString();
            data.push({
                day: curr.getDate().toString(),
                dateObj: new Date(curr),
                income: incomeMap[dKey] || 0,
                expense: expenseMap[dKey] || 0
            });
            curr.setDate(curr.getDate() + 1);
        }

        return data;
    }, [selectedPeriod, filteredIncomes, filteredExpenses]);

    const maxChartAmount = Math.max(
        ...chartData.map(d => Math.max(d.income, d.expense)), 
        1
    );

    return (
        <div className="pb-24">
             <h2 className="text-xl font-bold text-slate-800 mb-6">Historia Finansów</h2>
             
             {/* Period Selector */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Wybierz okres rozliczeniowy</label>
                <select 
                    value={selectedPeriod} 
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    {periods.length === 0 && <option value={selectedPeriod}>{formatPeriodLabel(selectedPeriod)}</option>}
                    {periods.map(p => (
                        <option key={p} value={p}>
                            {formatPeriodLabel(p)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Financial Summary Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Bilans okresu</h3>
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="block text-xs text-emerald-600 font-medium mb-1">Wpływy</span>
                        <span className="block text-lg font-bold text-emerald-700">+{totalIncome.toFixed(2)} zł</span>
                    </div>
                    <div className="flex-1 p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="block text-xs text-red-600 font-medium mb-1">Wydatki</span>
                        <span className="block text-lg font-bold text-red-700">-{totalExpense.toFixed(2)} zł</span>
                    </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Wynik:</span>
                    <span className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {balance > 0 ? '+' : ''}{balance.toFixed(2)} zł
                    </span>
                </div>
            </div>

            {/* Mixed Chart Section */}
            {(totalIncome > 0 || totalExpense > 0) && (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Wykres dzienny</h3>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-sm"></div>
                                <span className="text-[10px] text-slate-400">Wpływ</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
                                <span className="text-[10px] text-slate-400">Wydatek</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-end justify-between h-40 gap-1 overflow-hidden">
                        {chartData.map((d, i) => {
                            const incomeHeight = (d.income / maxChartAmount) * 100;
                            const expenseHeight = (d.expense / maxChartAmount) * 100;
                            const isWeekend = d.dateObj.getDay() === 0 || d.dateObj.getDay() === 6;
                            
                            return (
                                <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                                    {/* Bars Container */}
                                    <div className="relative w-full flex-1 flex justify-center items-end gap-[1px] mb-1">
                                        {/* Background highlight for weekends */}
                                        {isWeekend && <div className="absolute inset-0 bg-slate-50 -z-10 rounded-sm"></div>}
                                        
                                        {/* Income Bar */}
                                        <div 
                                            className="w-1.5 rounded-t-[1px] bg-emerald-500 transition-all duration-500"
                                            style={{ height: d.income > 0 ? `${incomeHeight}%` : '0px' }}
                                        ></div>
                                        
                                        {/* Expense Bar */}
                                        <div 
                                            className="w-1.5 rounded-t-[1px] bg-red-500 transition-all duration-500"
                                            style={{ height: d.expense > 0 ? `${expenseHeight}%` : '0px' }}
                                        ></div>
                                        
                                        {/* Tooltip */}
                                        {(d.income > 0 || d.expense > 0) && (
                                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold bg-slate-800 text-white p-1.5 rounded z-20 whitespace-nowrap pointer-events-none shadow-xl border border-slate-700">
                                                <div className="text-emerald-300">+{d.income}</div>
                                                <div className="text-red-300">-{d.expense}</div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* X-Axis Label (Sparse) */}
                                    <div className="h-4 flex items-center justify-center">
                                        {(i === 0 || i === chartData.length - 1 || d.day === '1' || d.day === '10' || d.day === '20') && (
                                            <span className="text-[9px] text-slate-400 font-medium">{d.day}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

             {/* Income List Section */}
             {filteredIncomes.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-emerald-700 uppercase mb-3 px-1">Szczegóły Wpływów</h3>
                    <div className="space-y-2">
                        {filteredIncomes.map((inc) => (
                             <div key={inc.id} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                        <Icons.ArrowUp className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">Wpływ środków</p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <span>{new Date(inc.date).toLocaleDateString('pl-PL')}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1 uppercase">
                                                {inc.source === 'bank' ? <Icons.Bank className="w-3 h-3" /> : <Icons.Wallet className="w-3 h-3" />}
                                                {inc.source === 'bank' ? 'Bank' : 'Gotówka'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-600 text-sm">+{inc.amount.toFixed(2)} zł</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit('income', inc)} className="p-1.5 text-slate-300 hover:text-blue-500 rounded"><Icons.Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteIncome(inc.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded"><Icons.Trash className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             )}

             {/* Expense Section */}
             {filteredExpenses.length > 0 ? (
                <div>
                     <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-sm font-bold text-slate-600 uppercase">Historia Wydatków</h3>
                     </div>
                     
                    {/* Breakdown List (Collapsible-like) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-2">Wg kategorii:</p>
                        {(Object.entries(breakdown) as [string, number][])
                        .sort(([,a], [,b]) => b - a)
                        .map(([catId, amount]) => {
                            const cat = categories.find(c => c.id === catId) || categories[0];
                            const percentage = (amount / totalExpense) * 100;
                            return (
                                <div key={catId} className="flex items-center justify-between text-sm py-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0].replace('bg-', 'bg-') || 'bg-slate-400'}`}></div>
                                        <span className="text-slate-600">{cat.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">{percentage.toFixed(0)}%</span>
                                        <span className="font-medium text-slate-800">{amount.toFixed(2)} zł</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Expenses List */}
                    <div className="space-y-3">
                        {filteredExpenses.map((exp) => {
                            const cat = categories.find(c => c.id === exp.category) || categories[0] || { label: 'Inne', color: 'bg-gray-100' };
                            return (
                                <div key={exp.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${cat.color}`}>
                                            {cat.label.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-medium text-slate-800 truncate text-sm">{cat.label}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                <span>{new Date(exp.date).toLocaleDateString('pl-PL')}</span>
                                                {exp.note && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="truncate max-w-[80px] italic">{exp.note}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700 text-sm">-{exp.amount.toFixed(2)} zł</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit('expense', exp)} className="p-1.5 text-slate-300 hover:text-blue-500 rounded"><Icons.Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => onDeleteExpense(exp.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded"><Icons.Trash className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
             ) : (
                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm">Brak wydatków w wybranym okresie.</p>
                </div>
             )}

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <form onSubmit={handleSave} className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-700 mb-3">
                            {editingItem.type === 'expense' ? 'Edytuj wydatek' : 'Edytuj wpływ'}
                        </h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Kwota</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full text-xl font-bold p-2 border border-slate-300 rounded-lg outline-emerald-500"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-emerald-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Źródło</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditSource('bank')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${editSource === 'bank' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-600'}`}
                                    >
                                        <Icons.Bank className="w-4 h-4" /> Bank
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditSource('cash')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${editSource === 'cash' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-300 text-slate-600'}`}
                                    >
                                        <Icons.Wallet className="w-4 h-4" /> Gotówka
                                    </button>
                                </div>
                            </div>

                            {editingItem.type === 'expense' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Kategoria</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setEditCategory(cat.id)}
                                                    className={`p-2 rounded-lg text-xs font-medium border ${editCategory === cat.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                                                >
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Notatka</label>
                                        <input 
                                            type="text"
                                            value={editNote}
                                            onChange={(e) => setEditNote(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg outline-emerald-500 text-sm"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => setEditingItem(null)} 
                                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
                            >
                                Anuluj
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold"
                            >
                                Zapisz
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
