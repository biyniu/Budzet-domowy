
import React, { useState } from 'react';
import { ExpenseRecord, MoneySource, Category } from '../types';
import { Icons } from '../constants';

interface ExpensesProps {
    expenses: ExpenseRecord[];
    categories: Category[];
    onAdd: (amount: number, category: string, note: string, source: MoneySource) => void;
    onEdit: (id: string, amount: number, category: string, note: string, source: MoneySource) => void;
    onDelete: (id: string) => void;
    onAddCategory: (label: string) => void;
    balance: { bank: number, cash: number };
    payday: number;
}

export const Expenses: React.FC<ExpensesProps> = ({ expenses, categories, onAdd, onEdit, onDelete, onAddCategory, balance, payday }) => {
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);

    // Form Fields
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [source, setSource] = useState<MoneySource>('bank');
    
    // New category state
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Set default category when modal opens
    React.useEffect(() => {
        if (isModalOpen && !editingExpense) {
             if (categories.length > 0 && !category) {
                setCategory(categories[0].id);
            }
            setSource('bank'); // Default source for new
        }
    }, [isModalOpen, editingExpense, categories, category]);

    const openAdd = () => {
        setEditingExpense(null);
        setAmount('');
        setNote('');
        setIsModalOpen(true);
    };

    const openEdit = (exp: ExpenseRecord) => {
        setEditingExpense(exp);
        setAmount(exp.amount.toString());
        setCategory(exp.category);
        setNote(exp.note || '');
        setSource(exp.source);
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const sanitized = amount.replace(',', '.').replace(/\s/g, '');
        const val = parseFloat(sanitized);

        if (!isNaN(val) && val > 0) {
            if (editingExpense) {
                onEdit(editingExpense.id, val, category, note, source);
            } else {
                onAdd(val, category, note, source);
            }
            setIsModalOpen(false);
        }
    };

    const handleCreateCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName.trim());
            setNewCategoryName('');
            setIsCreatingCategory(false);
        }
    };

    // Calculate current financial month range
    const today = new Date();
    let startMonth = today.getMonth();
    let startYear = today.getFullYear();
    
    // If today is before payday, we are in the previous financial month's cycle
    if (today.getDate() < payday) {
        startMonth = startMonth - 1;
        if (startMonth < 0) {
            startMonth = 11;
            startYear = startYear - 1;
        }
    }
    
    const startDate = new Date(startYear, startMonth, payday);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Filter expenses
    const currentMonthExpenses = expenses.filter(exp => {
        const d = new Date(exp.date);
        return d >= startDate && d < endDate;
    });

    const sortedExpenses = [...currentMonthExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const totalMonth = currentMonthExpenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="pb-32 relative min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Wydatki bieżące</h2>
                <div className="text-xs text-right text-slate-500">
                    <p>Okres rozliczeniowy:</p>
                    <p className="font-medium">{startDate.toLocaleDateString('pl-PL')} - {new Date(endDate.getTime() - 86400000).toLocaleDateString('pl-PL')}</p>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {sortedExpenses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Icons.Cart className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm">Brak wydatków w tym miesiącu.</p>
                    </div>
                )}
                
                {sortedExpenses.map((exp) => {
                    const cat = categories.find(c => c.id === exp.category) || categories[0] || { label: 'Inne', color: 'bg-gray-100' };
                    return (
                        <div key={exp.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${cat.color}`}>
                                    {cat.label.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="overflow-hidden min-w-0">
                                    <p className="font-medium text-slate-800 truncate">{cat.label}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>{new Date(exp.date).toLocaleDateString('pl-PL')}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            {exp.source === 'bank' ? <Icons.Bank className="w-3 h-3" /> : <Icons.Wallet className="w-3 h-3" />}
                                            {exp.source === 'bank' ? 'Bank' : 'Gotówka'}
                                        </span>
                                    </div>
                                    {exp.note && <p className="text-xs text-slate-400 italic truncate">{exp.note}</p>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 pl-2 shrink-0">
                                <span className="font-bold text-slate-900 whitespace-nowrap">-{exp.amount.toFixed(2)} zł</span>
                                <div className="flex gap-1 ml-1">
                                     <button onClick={() => openEdit(exp)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-slate-50 rounded">
                                        <Icons.Pencil className="w-4 h-4" />
                                     </button>
                                     <button onClick={() => onDelete(exp.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded">
                                        <Icons.Trash className="w-4 h-4" />
                                     </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Monthly Summary Footer - Stick to bottom of content area but above nav */}
            <div className="mt-8 bg-slate-800 rounded-xl p-4 text-white shadow-lg">
                <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Suma wydatków (okres):</span>
                    <span className="text-2xl font-bold">{totalMonth.toFixed(2)} zł</span>
                </div>
            </div>

            {/* Fixed FAB Button - Moved slightly higher to avoid conflict with nav */}
            <div className="fixed bottom-24 right-4 z-30">
                <button
                    onClick={openAdd}
                    className="bg-emerald-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-2 border-white"
                >
                    <Icons.Plus className="w-6 h-6" />
                </button>
            </div>

            {/* Add/Edit Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
                    {/* Modal Content */}
                    <form 
                        onSubmit={handleSubmit} 
                        className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:rounded-2xl rounded-t-2xl p-6 animate-in slide-in-from-bottom-full duration-300 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingExpense ? 'Edytuj wydatek' : 'Nowy wydatek'}
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {/* Amount Input */}
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase text-center">Kwota</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        className="w-full text-5xl font-bold text-slate-900 placeholder-slate-300 border-none focus:ring-0 p-0 text-center bg-transparent outline-none"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            {/* Source Selection */}
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Zapłacono z</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSource('bank')}
                                        className={`flex-1 py-3 px-2 rounded-xl border text-sm font-medium flex flex-col items-center justify-center gap-1 transition-all ${source === 'bank' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        <Icons.Bank className="w-5 h-5" /> 
                                        <span>Bank ({balance.bank.toFixed(0)})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSource('cash')}
                                        className={`flex-1 py-3 px-2 rounded-xl border text-sm font-medium flex flex-col items-center justify-center gap-1 transition-all ${source === 'cash' ? 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-500/20' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        <Icons.Wallet className="w-5 h-5" /> 
                                        <span>Gotówka ({balance.cash.toFixed(0)})</span>
                                    </button>
                                </div>
                            </div>

                            {/* Category Grid */}
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Kategoria</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`p-2 rounded-lg text-xs font-medium border transition-all text-center h-16 flex items-center justify-center ${
                                                category === cat.id 
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105 z-10' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                    {/* Add Category Button */}
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingCategory(true)}
                                        className="p-2 rounded-lg text-xs font-medium border border-dashed border-emerald-300 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all text-center h-16 flex flex-col items-center justify-center"
                                    >
                                        <Icons.Plus className="w-5 h-5 mb-1" />
                                        Dodaj
                                    </button>
                                </div>
                                
                                {/* Inline Category Creator */}
                                {isCreatingCategory && (
                                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-emerald-200 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex gap-2">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder="Nazwa nowej kategorii"
                                                className="flex-1 p-2 text-sm border border-slate-300 rounded-md outline-emerald-500"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                            />
                                            <button 
                                                type="button"
                                                onClick={handleCreateCategory}
                                                className="bg-emerald-600 text-white px-4 rounded-md text-sm font-bold"
                                            >
                                                OK
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setIsCreatingCategory(false)}
                                                className="bg-white border border-slate-300 text-slate-500 px-3 rounded-md text-sm"
                                            >
                                                X
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Note Input */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Notatka (opcjonalnie)"
                                    className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg py-3 px-3 text-sm focus:ring-2 focus:ring-slate-500 outline-none placeholder-slate-400"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-4 shrink-0">
                            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform">
                                {editingExpense ? 'Zapisz zmiany' : 'Zatwierdź'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
