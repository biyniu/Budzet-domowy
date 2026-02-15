import React, { useState } from 'react';
import { Envelope, MoneySource, EnvelopeTransaction } from '../types';
import { Icons } from '../constants';

interface EnvelopesProps {
    envelopes: Envelope[];
    transactions: EnvelopeTransaction[];
    onAdd: (name: string, description: string) => void;
    onDelete: (id: string) => void;
    onTransfer: (id: string, amount: number, source: MoneySource) => void;
    onSpend: (id: string, amount: number, note: string) => void;
}

export const Envelopes: React.FC<EnvelopesProps> = ({ envelopes, transactions, onAdd, onDelete, onTransfer, onSpend }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    
    // State for funding/spending
    const [activeEnvelopeId, setActiveEnvelopeId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'fund' | 'spend'>('fund');
    const [amount, setAmount] = useState('');
    const [fundSource, setFundSource] = useState<MoneySource>('bank');
    const [spendNote, setSpendNote] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName) {
            onAdd(newName, newDesc);
            setNewName('');
            setNewDesc('');
            setIsAdding(false);
        }
    };

    const handleAction = (e: React.FormEvent) => {
        e.preventDefault();
        const sanitized = amount.replace(',', '.').replace(/\s/g, '');
        const val = parseFloat(sanitized);

        if (activeEnvelopeId && !isNaN(val) && val > 0) {
            if (actionType === 'fund') {
                onTransfer(activeEnvelopeId, val, fundSource);
            } else {
                onSpend(activeEnvelopeId, val, spendNote);
            }
            closeActionModal();
        }
    };

    const closeActionModal = () => {
        setActiveEnvelopeId(null);
        setAmount('');
        setFundSource('bank');
        setSpendNote('');
    };

    const openAction = (id: string, type: 'fund' | 'spend') => {
        setActiveEnvelopeId(id);
        setActionType(type);
    };

    // Get envelope name helper
    const getEnvName = (id: string) => envelopes.find(e => e.id === id)?.name || 'Usunięta';

    return (
        <div className="pb-24">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Moje Koperty</h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
                {envelopes.map((env) => (
                    <div key={env.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col relative group">
                        <button 
                            onClick={() => onDelete(env.id)}
                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <Icons.Trash className="w-4 h-4" />
                        </button>
                        
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                            <Icons.Envelope className="w-5 h-5" />
                        </div>
                        
                        <h3 className="font-semibold text-slate-800 truncate">{env.name}</h3>
                        <p className="text-xs text-slate-500 mb-3 h-4 truncate">{env.description || 'Bez opisu'}</p>
                        
                        <div className="mt-auto">
                            <p className="text-lg font-bold text-slate-900 mb-2">{env.allocated.toFixed(2)} zł</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => openAction(env.id, 'fund')}
                                    className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-100 hover:bg-emerald-100"
                                >
                                    + Wpłać
                                </button>
                                <button 
                                    onClick={() => openAction(env.id, 'spend')}
                                    className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded border border-slate-200 hover:bg-slate-100"
                                >
                                    - Wydaj
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center min-h-[160px] text-slate-400 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                    <Icons.Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Nowa koperta</span>
                </button>
            </div>

            {/* Transaction History */}
            <h3 className="text-md font-bold text-slate-700 mb-4 px-1">Historia operacji</h3>
            <div className="space-y-3">
                {transactions.length === 0 ? (
                     <p className="text-sm text-slate-400 text-center py-4">Brak operacji</p>
                ) : (
                    transactions.slice().reverse().map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 text-sm">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${t.type === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {t.type === 'in' ? <Icons.ArrowDown className="w-4 h-4"/> : <Icons.ArrowUp className="w-4 h-4"/>}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800">{getEnvName(t.envelopeId)}</p>
                                    <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString('pl-PL')}{t.note ? ` • ${t.note}` : ''}</p>
                                </div>
                            </div>
                            <span className={`font-bold ${t.type === 'in' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {t.type === 'in' ? '+' : '-'}{t.amount.toFixed(2)} zł
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Modal for Creating Envelope */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <form onSubmit={handleCreate} className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Stwórz nową kopertę</h3>
                        <input
                            className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg mb-3 outline-emerald-500 placeholder-slate-400"
                            placeholder="Nazwa (np. Wakacje)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            required
                        />
                         <input
                            className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg mb-4 outline-emerald-500 placeholder-slate-400"
                            placeholder="Opis (opcjonalne)"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-100 rounded-lg font-medium text-slate-700">Anuluj</button>
                            <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-medium">Stwórz</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal for Funding/Spending */}
            {activeEnvelopeId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <form onSubmit={handleAction} className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
                        <h3 className="text-lg font-bold mb-2">
                            {actionType === 'fund' ? 'Przelej do koperty' : 'Wydatek z koperty'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            {actionType === 'fund' ? 'Wybierz skąd pobrać środki.' : 'Podaj kwotę i cel wydatku.'}
                        </p>
                        
                        <input
                            type="text"
                            inputMode="decimal"
                            className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg mb-4 text-xl font-bold outline-emerald-500 text-center placeholder-slate-400"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            autoFocus
                            required
                        />

                        {actionType === 'fund' ? (
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Źródło finansowania</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFundSource('bank')}
                                        className={`flex-1 py-3 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${fundSource === 'bank' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        <Icons.Bank className="w-4 h-4" /> Bank
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFundSource('cash')}
                                        className={`flex-1 py-3 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${fundSource === 'cash' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        <Icons.Wallet className="w-4 h-4" /> Gotówka
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Na co wydano?</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg text-sm outline-emerald-500 placeholder-slate-400"
                                    placeholder="np. Prezent, Rezerwa..."
                                    value={spendNote}
                                    onChange={(e) => setSpendNote(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        
                        <div className="flex gap-3">
                            <button type="button" onClick={closeActionModal} className="flex-1 py-3 bg-slate-100 rounded-lg font-medium text-slate-700">Anuluj</button>
                            <button type="submit" className={`flex-1 py-3 text-white rounded-lg font-medium ${actionType === 'fund' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                                {actionType === 'fund' ? 'Zasil' : 'Wydaj'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};