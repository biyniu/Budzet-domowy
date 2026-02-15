import React, { useState } from 'react';
import { FixedExpense, MoneySource } from '../types';
import { Icons } from '../constants';

interface FixedExpensesProps {
    expenses: FixedExpense[];
    onToggle: (id: string) => void;
    onAdd: (name: string, amount: number, source: MoneySource) => void;
    onDelete: (id: string) => void;
    onReset: () => void;
}

export const FixedExpenses: React.FC<FixedExpensesProps> = ({ expenses, onToggle, onAdd, onDelete, onReset }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newSource, setNewSource] = useState<MoneySource>('bank');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const sanitized = newAmount.replace(',', '.').replace(/\s/g, '');
        const val = parseFloat(sanitized);
        if (newName && !isNaN(val)) {
            onAdd(newName, val, newSource);
            setNewName('');
            setNewAmount('');
            setIsAdding(false);
        }
    };

    const totalFixed = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaid = expenses.filter(e => e.isPaid).reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="pb-24">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Wydatki Stałe</h2>
                {/* Manual reset hidden/secondary now since we have auto-reset, but kept for manual overrides */}
                <button onClick={onReset} className="text-slate-500 hover:text-emerald-600 p-2" title="Wymuś reset miesiąca">
                   <Icons.Refresh className="w-5 h-5" />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
                <div className="flex justify-between text-sm mb-2 text-slate-600">
                    <span>Opłacono: <strong>{totalPaid.toFixed(2)} zł</strong></span>
                    <span>Suma: <strong>{totalFixed.toFixed(2)} zł</strong></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${totalFixed > 0 ? (totalPaid / totalFixed) * 100 : 0}%` }}
                    ></div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {expenses.map((expense) => (
                    <div 
                        key={expense.id} 
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            expense.isPaid ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                    >
                        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => onToggle(expense.id)}>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${expense.isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                {expense.isPaid && <Icons.CheckList className="w-3 h-3 text-white" />}
                            </div>
                            <div className="overflow-hidden">
                                <p className={`font-medium truncate ${expense.isPaid ? 'text-emerald-800 line-through' : 'text-slate-800'}`}>{expense.name}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{expense.amount.toFixed(2)} zł</span>
                                    <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase">
                                        {expense.source === 'bank' ? <Icons.Bank className="w-3 h-3" /> : <Icons.Wallet className="w-3 h-3" />}
                                        {expense.source === 'bank' ? 'Bank' : 'Gotówka'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => onDelete(expense.id)}
                            className="p-2 text-slate-400 hover:text-red-500"
                        >
                            <Icons.Trash className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Button */}
            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full mt-6 py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                    <Icons.Plus className="w-5 h-5" /> Dodaj wydatek
                </button>
            ) : (
                <form onSubmit={handleAdd} className="mt-6 bg-white p-4 rounded-xl shadow-md border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Nowy wydatek stały</h3>
                    <div className="space-y-3 mb-4">
                        <input
                            type="text"
                            placeholder="Nazwa (np. Czynsz)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="border border-slate-300 bg-white text-slate-900 p-2 rounded-lg text-sm w-full outline-emerald-500 placeholder-slate-400"
                            required
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Kwota"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                className="border border-slate-300 bg-white text-slate-900 p-2 rounded-lg text-sm w-full outline-emerald-500 placeholder-slate-400"
                                required
                            />
                        </div>
                        
                        <div>
                            <span className="text-xs font-semibold text-slate-500 mb-1 block">Pobieraj z:</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewSource('bank')}
                                    className={`flex-1 py-2 rounded-md text-xs font-medium border flex items-center justify-center gap-1 ${newSource === 'bank' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <Icons.Bank className="w-3 h-3" /> Bank
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewSource('cash')}
                                    className={`flex-1 py-2 rounded-md text-xs font-medium border flex items-center justify-center gap-1 ${newSource === 'cash' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    <Icons.Wallet className="w-3 h-3" /> Gotówka
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-slate-100 rounded-lg text-sm text-slate-700">Anuluj</button>
                         <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm">Zapisz</button>
                    </div>
                </form>
            )}
        </div>
    );
};