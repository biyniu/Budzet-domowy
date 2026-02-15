
import React, { useState } from 'react';
import { Envelope, MoneySource, EnvelopeTransaction } from '../types';
import { Icons } from '../constants';

interface EnvelopesProps {
    envelopes: Envelope[];
    transactions: EnvelopeTransaction[];
    onAdd: (name: string, description: string, targetAmount: number) => void;
    onEdit: (id: string, name: string, description: string, allocated: number, targetAmount: number) => void;
    onDelete: (id: string) => void;
    onTransfer: (id: string, amount: number, source: MoneySource) => void;
    onSpend: (id: string, amount: number, note: string) => void;
}

export const Envelopes: React.FC<EnvelopesProps> = ({ envelopes, transactions, onAdd, onEdit, onDelete, onTransfer, onSpend }) => {
    // Adding/Editing State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
    
    // Form fields
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [targetAmount, setTargetAmount] = useState(''); // New field for goal
    const [currentAmount, setCurrentAmount] = useState(''); // Only used in edit mode
    
    // Fund/Spend State
    const [activeEnvelopeId, setActiveEnvelopeId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'fund' | 'spend'>('fund');
    const [amount, setAmount] = useState('');
    const [fundSource, setFundSource] = useState<MoneySource>('bank');
    const [spendNote, setSpendNote] = useState('');

    const openAdd = () => {
        setEditingEnvelope(null);
        setName('');
        setDesc('');
        setTargetAmount('');
        setCurrentAmount('0');
        setIsModalOpen(true);
    };

    const openEdit = (env: Envelope) => {
        setEditingEnvelope(env);
        setName(env.name);
        setDesc(env.description || '');
        setTargetAmount(env.targetAmount ? env.targetAmount.toString() : '');
        setCurrentAmount(env.allocated.toString());
        setIsModalOpen(true);
    };

    const handleSaveEnvelope = (e: React.FormEvent) => {
        e.preventDefault();
        if (name) {
            const targetVal = targetAmount ? parseFloat(targetAmount.replace(',', '.').replace(/\s/g, '')) : 0;

            if (editingEnvelope) {
                // Edit existing
                const val = parseFloat(currentAmount.replace(',', '.'));
                const validAllocated = isNaN(val) ? editingEnvelope.allocated : val;
                onEdit(editingEnvelope.id, name, desc, validAllocated, isNaN(targetVal) ? 0 : targetVal);
            } else {
                // Add new
                onAdd(name, desc, isNaN(targetVal) ? 0 : targetVal);
            }
            setIsModalOpen(false);
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
            <h2 className="text-xl font-bold text-slate-800 mb-6">Moje Cele i Koperty</h2>

            <div className="grid grid-cols-1 gap-4 mb-8">
                {envelopes.map((env) => {
                    const hasGoal = env.targetAmount && env.targetAmount > 0;
                    const progress = hasGoal ? Math.min((env.allocated / (env.targetAmount || 1)) * 100, 100) : 0;
                    const remaining = hasGoal ? Math.max((env.targetAmount || 0) - env.allocated, 0) : 0;

                    return (
                        <div key={env.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative group overflow-hidden">
                            {/* Header Row */}
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${hasGoal ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <Icons.Envelope className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate text-lg">{env.name}</h3>
                                        <p className="text-xs text-slate-500 truncate">{env.description || (hasGoal ? 'Cel oszczędnościowy' : 'Koperta wydatków')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(env)} className="text-slate-300 hover:text-blue-500 p-2"><Icons.Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(env.id)} className="text-slate-300 hover:text-red-500 p-2"><Icons.Trash className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* Amount Row */}
                            <div className="flex items-baseline gap-2 mb-3 relative z-10">
                                <span className="text-2xl font-bold text-slate-900">{env.allocated.toFixed(2)} zł</span>
                                {hasGoal && <span className="text-xs text-slate-400 font-medium">z {env.targetAmount?.toFixed(2)} zł</span>}
                            </div>

                            {/* Progress Bar (Only if goal exists) */}
                            {hasGoal && (
                                <div className="mb-4 relative z-10">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase">
                                        <span>Postęp: {progress.toFixed(0)}%</span>
                                        {remaining > 0 ? <span className="text-indigo-500">Brakuje: {remaining.toFixed(2)} zł</span> : <span className="text-emerald-500">Cel osiągnięty!</span>}
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Buttons */}
                            <div className="flex gap-2 relative z-10 mt-auto">
                                <button 
                                    onClick={() => openAction(env.id, 'fund')}
                                    className="flex-1 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                >
                                    + Wpłać
                                </button>
                                <button 
                                    onClick={() => openAction(env.id, 'spend')}
                                    className="flex-1 py-2 bg-slate-50 text-slate-600 text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                                >
                                    - Wydaj
                                </button>
                            </div>

                            {/* Decorative Background for Goals */}
                            {hasGoal && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-50 z-0"></div>
                            )}
                        </div>
                    );
                })}
                
                <button 
                    onClick={openAdd}
                    className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center min-h-[120px] text-slate-400 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                    <Icons.Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Nowy Cel / Koperta</span>
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

            {/* Modal for Creating/Editing Envelope */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <form onSubmit={handleSaveEnvelope} className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">{editingEnvelope ? 'Edytuj kopertę' : 'Nowa koperta / Cel'}</h3>
                        
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nazwa</label>
                                <input
                                    className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg outline-emerald-500 placeholder-slate-400"
                                    placeholder="np. Wakacje, Mechanik"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Cel Oszczędnościowy (opcjonalne)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg outline-emerald-500 placeholder-slate-400"
                                    placeholder="0.00"
                                    value={targetAmount}
                                    onChange={(e) => setTargetAmount(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Wpisz kwotę, aby zobaczyć pasek postępu.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Opis</label>
                                <input
                                    className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg outline-emerald-500 placeholder-slate-400"
                                    placeholder="Krótki opis"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                />
                            </div>

                            {/* Allow manual edit of amount only in edit mode */}
                            {editingEnvelope && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Korekta stanu (ręczna)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded outline-emerald-500"
                                        value={currentAmount}
                                        onChange={(e) => setCurrentAmount(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-lg font-medium text-slate-700">Anuluj</button>
                            <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-medium">Zapisz</button>
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
