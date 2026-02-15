
import React, { useState } from 'react';
import { AccountBalance, Envelope } from '../types';
import { Icons } from '../constants';

interface DashboardProps {
    balance: AccountBalance;
    envelopes: Envelope[];
    onAddIncome: (amount: number, source: 'bank' | 'cash', date: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ balance, envelopes, onAddIncome }) => {
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState<'bank' | 'cash'>('bank');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Robust parsing: replace comma with dot, remove spaces
        const sanitized = amount.replace(',', '.').replace(/\s/g, '');
        const val = parseFloat(sanitized);
        if (!isNaN(val) && val > 0) {
            onAddIncome(val, source, date);
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]); // Reset date to today
            setIsAdding(false);
        }
    };

    const totalFree = balance.bank + balance.cash;
    const totalEnvelopes = envelopes.reduce((acc, curr) => acc + curr.allocated, 0);
    const netWorth = totalFree + totalEnvelopes;

    return (
        <div className="space-y-6 pb-20">
            {/* Main Card - Now Free Funds (Wolne Środki) is primary */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-emerald-100 text-sm font-medium mb-1 uppercase tracking-wider">Wolne Środki</h2>
                    <p className="text-4xl font-bold tracking-tight">{totalFree.toFixed(2)} zł</p>
                    <div className="mt-4 flex gap-4 text-xs font-medium text-emerald-100">
                         <div>
                            <span className="opacity-70">Majątek netto:</span> <span className="text-white">{netWorth.toFixed(2)} zł</span>
                         </div>
                         <div>
                            <span className="opacity-70">W kopertach:</span> <span className="text-white">{totalEnvelopes.toFixed(2)} zł</span>
                         </div>
                    </div>
                </div>
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            </div>

            {/* Breakdown */}
            <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Szczegóły salda</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full mb-2">
                        <Icons.Bank className="w-6 h-6" />
                    </div>
                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Bank</span>
                    <span className="text-xl font-semibold text-slate-800">{balance.bank.toFixed(2)} zł</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                    <div className="p-2 bg-green-100 text-green-600 rounded-full mb-2">
                        <Icons.Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Gotówka</span>
                    <span className="text-xl font-semibold text-slate-800">{balance.cash.toFixed(2)} zł</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4">
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <Icons.Plus className="w-5 h-5" />
                        Dodaj Wpływ
                    </button>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl shadow-md border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-lg font-semibold mb-4 text-slate-800">Dodaj Środki</h3>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Kwota</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full text-2xl font-bold p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-600 mb-2">Źródło</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSource('bank')}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${source === 'bank' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-600'}`}
                                >
                                    <Icons.Bank className="w-4 h-4" /> Bank
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSource('cash')}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${source === 'cash' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-300 text-slate-600'}`}
                                >
                                    <Icons.Wallet className="w-4 h-4" /> Gotówka
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium shadow-sm"
                            >
                                Dodaj
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
