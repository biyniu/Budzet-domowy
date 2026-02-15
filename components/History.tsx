
import React, { useState } from 'react';
import { ExpenseRecord, Category } from '../types';
import { Icons } from '../constants';

interface HistoryProps {
    expenses: ExpenseRecord[];
    categories: Category[];
    payday: number;
}

export const History: React.FC<HistoryProps> = ({ expenses, categories, payday }) => {
    // Generate list of months available in history
    // For simplicity, we just look at unique months in the expense list
    // A more robust app would generate dates based on Payday ranges
    
    // Logic: An expense date '2023-11-05' with payday 10 belongs to period "Oct 10 - Nov 09".
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

    const periods: string[] = Array.from<string>(new Set(expenses.map(e => getPeriodKey(e.date)))).sort().reverse();
    
    // Default to latest period or current
    const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || getPeriodKey(new Date().toISOString()));

    const formatPeriodLabel = (isoDate: string) => {
        const start = new Date(isoDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        
        return `${start.toLocaleDateString('pl-PL')} - ${end.toLocaleDateString('pl-PL')}`;
    };

    // Filter
    const filteredExpenses = expenses.filter(e => getPeriodKey(e.date) === selectedPeriod).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const total = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate Breakdown
    const breakdown = filteredExpenses.reduce((acc, curr) => {
        const catId = curr.category;
        if (!acc[catId]) acc[catId] = 0;
        acc[catId] += curr.amount;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="pb-24">
             <h2 className="text-xl font-bold text-slate-800 mb-6">Historia Zakupów</h2>
             
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
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500 text-sm font-semibold">Suma wydatków:</span>
                        <span className="text-xl font-bold text-slate-800">{total.toFixed(2)} zł</span>
                    </div>

                    {/* Breakdown List */}
                    {total > 0 && (
                        <div className="space-y-2">
                             <p className="text-xs text-slate-400 uppercase font-bold mb-2">Wg kategorii:</p>
                             {(Object.entries(breakdown) as [string, number][])
                                .sort(([,a], [,b]) => b - a)
                                .map(([catId, amount]) => {
                                    const cat = categories.find(c => c.id === catId) || categories[0];
                                    const percentage = (amount / total) * 100;
                                    return (
                                        <div key={catId} className="flex items-center justify-between text-sm">
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
                    )}
                </div>
             </div>

             {/* Expenses List */}
             <div className="space-y-3">
                {filteredExpenses.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <p>Brak wydatków w wybranym okresie.</p>
                    </div>
                ) : (
                    filteredExpenses.map((exp) => {
                        const cat = categories.find(c => c.id === exp.category) || categories[0] || { label: 'Inne', color: 'bg-gray-100' };
                        return (
                            <div key={exp.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${cat.color}`}>
                                        {cat.label.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-slate-800 truncate text-sm">{cat.label}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(exp.date).toLocaleDateString('pl-PL')}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-slate-700 text-sm">-{exp.amount.toFixed(2)} zł</span>
                            </div>
                        );
                    })
                )}
             </div>
        </div>
    );
};
