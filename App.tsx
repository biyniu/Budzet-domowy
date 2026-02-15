
import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { FixedExpenses } from './components/FixedExpenses';
import { Envelopes } from './components/Envelopes';
import { Expenses } from './components/Expenses';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { AppState, ViewState, FixedExpense, MoneySource } from './types';
import { Icons, DEFAULT_CATEGORIES } from './constants';

// Firebase
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DEFAULT_FIXED: FixedExpense[] = [
    { id: '1', name: 'Czynsz', amount: 0, isPaid: false, source: 'bank' },
    { id: '2', name: 'Prąd', amount: 0, isPaid: false, source: 'bank' },
    { id: '3', name: 'Internet', amount: 0, isPaid: false, source: 'bank' },
    { id: '4', name: 'Telefon', amount: 0, isPaid: false, source: 'bank' },
];

const INITIAL_STATE: AppState = {
    balance: { bank: 0, cash: 0 },
    fixedExpenses: DEFAULT_FIXED,
    envelopes: [],
    envelopeTransactions: [],
    expenses: [],
    categories: DEFAULT_CATEGORIES,
    settings: {
        payday: 1, 
        lastResetDate: new Date().toISOString() 
    }
};

const App: React.FC = () => {
    const [view, setView] = useState<ViewState>('dashboard');
    const [state, setState] = useState<AppState>(INITIAL_STATE);
    
    // Auth & Loading state
    const [user, setUser] = useState<User | any | null>(null);
    const [isAppLoaded, setIsAppLoaded] = useState(false); // Data fetched from DB
    const [isAuthChecking, setIsAuthChecking] = useState(true); // Checking if user is logged in
    const [isSaving, setIsSaving] = useState(false);

    // --- Authentication & Data Loading ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // If we are already in Guest Mode (fake user), ignore Firebase updates
            if (user?.isGuest) return;

            setUser(currentUser);
            setIsAuthChecking(false);

            if (currentUser) {
                // User logged in - Fetch data from Firestore
                try {
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data() as AppState;
                        // Migrations/Safety checks
                        if (!data.settings) data.settings = INITIAL_STATE.settings;
                        if (!data.categories) data.categories = DEFAULT_CATEGORIES;
                        setState(data);
                    } else {
                        // First time user - save initial state to DB
                        await setDoc(docRef, INITIAL_STATE);
                        setState(INITIAL_STATE);
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                    alert("Błąd pobierania danych z chmury.");
                } finally {
                    setIsAppLoaded(true);
                }
            } else {
                // User logged out
                setIsAppLoaded(false);
            }
        });

        return () => unsubscribe();
    }, [user?.isGuest]); // Dependency allows us to ignore this hook if guest mode is active

    // --- Data Persistence (Save on Change) ---
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (!user || !isAppLoaded) return;
        
        // Skip saving for Guest User to avoid Permission Denied errors
        if (user.isGuest) return;

        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const saveData = async () => {
            setIsSaving(true);
            try {
                const docRef = doc(db, 'users', user.uid);
                await setDoc(docRef, state);
            } catch (error) {
                console.error("Error saving data:", error);
            } finally {
                setTimeout(() => setIsSaving(false), 500); 
            }
        };

        const timeoutId = setTimeout(saveData, 1000); 
        return () => clearTimeout(timeoutId);

    }, [state, user, isAppLoaded]);


    // --- Login Handler ---
    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
            console.error("Login failed", error);
            // Handle missing config gracefully
            if (error.code === 'auth/configuration-not-found' || error.message.includes('api key')) {
                alert("Błąd konfiguracji Firebase. Upewnij się, że uzupełniłeś plik firebase.ts swoimi kluczami.");
            } else if (error.code === 'auth/unauthorized-domain') {
                const domain = window.location.hostname;
                alert(`Domena "${domain}" nie jest autoryzowana.\n\nMusisz dodać ją w konsoli Firebase:\nAuthentication -> Settings -> Authorized Domains`);
            } else if (error.code === 'auth/popup-closed-by-user') {
                // User closed popup, ignore
            } else if (error.code === 'auth/op-not-supported-in-this-environment') {
                alert("Logowanie przez popup nie jest wspierane w tym środowisku (np. podgląd wewnątrz innej strony). Użyj 'Trybu Demo'.");
            } else {
                alert("Logowanie nie powiodło się: " + (error.message || "Nieznany błąd"));
            }
        }
    };

    // --- Guest / Demo Login Handler ---
    const handleGuestLogin = () => {
        const guestUser = {
            uid: 'guest_demo_user',
            email: 'demo@gosc.local',
            displayName: 'Gość (Demo)',
            isGuest: true // Flag to identify guest
        };
        setUser(guestUser);
        setState(INITIAL_STATE);
        setIsAppLoaded(true);
        setIsAuthChecking(false);
    };


    // --- Logic Wrappers (Same as before) ---
    // Auto Reset Logic
    useEffect(() => {
        if (!isAppLoaded) return;
        const payday = state.settings.payday;
        const now = new Date();
        const getFinancialMonthStart = (date: Date, payDay: number) => {
            let year = date.getFullYear();
            let month = date.getMonth();
            if (date.getDate() < payDay) {
                month--;
                if (month < 0) {
                    month = 11;
                    year--;
                }
            }
            return new Date(year, month, payDay).toDateString(); 
        };
        const currentCycleStart = getFinancialMonthStart(now, payday);
        const lastReset = state.settings.lastResetDate ? getFinancialMonthStart(new Date(state.settings.lastResetDate), payday) : '';

        if (currentCycleStart !== lastReset) {
            setState(prev => ({
                ...prev,
                fixedExpenses: prev.fixedExpenses.map(f => ({ ...f, isPaid: false })),
                settings: { ...prev.settings, lastResetDate: now.toISOString() }
            }));
        }
    }, [isAppLoaded, state.settings.payday]);

    // Handlers
    const addIncome = (amount: number, source: 'bank' | 'cash') => {
        setState(prev => ({ ...prev, balance: { ...prev.balance, [source]: prev.balance[source] + amount } }));
    };
    const toggleFixed = (id: string) => {
        const expense = state.fixedExpenses.find(e => e.id === id);
        if (!expense) return;
        const willBePaid = !expense.isPaid;
        setState(prev => {
            let newBank = prev.balance.bank;
            let newCash = prev.balance.cash;
            if (willBePaid) expense.source === 'bank' ? newBank -= expense.amount : newCash -= expense.amount;
            else expense.source === 'bank' ? newBank += expense.amount : newCash += expense.amount;
            return {
                ...prev,
                balance: { bank: newBank, cash: newCash },
                fixedExpenses: prev.fixedExpenses.map(f => f.id === id ? { ...f, isPaid: willBePaid } : f)
            };
        });
    };
    const addFixed = (name: string, amount: number, source: MoneySource) => {
        setState(prev => ({ ...prev, fixedExpenses: [...prev.fixedExpenses, { id: Date.now().toString(), name, amount, isPaid: false, source }] }));
    };
    const deleteFixed = (id: string) => {
        setState(prev => ({ ...prev, fixedExpenses: prev.fixedExpenses.filter(f => f.id !== id) }));
    };
    const resetFixed = () => {
        if(window.confirm("Zresetować status rachunków?")) setState(prev => ({ ...prev, fixedExpenses: prev.fixedExpenses.map(f => ({ ...f, isPaid: false })) }));
    };
    const addEnvelope = (name: string, description: string) => {
        setState(prev => ({ ...prev, envelopes: [...prev.envelopes, { id: Date.now().toString(), name, description, allocated: 0 }] }));
    };
    const deleteEnvelope = (id: string) => {
        if (window.confirm("Usunąć kopertę?")) {
             const env = state.envelopes.find(e => e.id === id);
             const refund = env ? env.allocated : 0;
             setState(prev => ({ ...prev, balance: { ...prev.balance, bank: prev.balance.bank + refund }, envelopes: prev.envelopes.filter(e => e.id !== id) }));
        }
    };
    const fundEnvelope = (id: string, amount: number, source: MoneySource) => {
        setState(prev => ({
            ...prev,
            balance: { ...prev.balance, [source]: prev.balance[source] - amount },
            envelopes: prev.envelopes.map(e => e.id === id ? { ...e, allocated: e.allocated + amount } : e),
            envelopeTransactions: [...(prev.envelopeTransactions || []), { id: Date.now().toString(), envelopeId: id, amount, type: 'in', date: new Date().toISOString(), note: 'Zasilenie' }]
        }));
    };
    const spendFromEnvelope = (id: string, amount: number, note: string) => {
         setState(prev => ({
            ...prev,
            envelopes: prev.envelopes.map(e => e.id === id ? { ...e, allocated: e.allocated - amount } : e),
            envelopeTransactions: [...(prev.envelopeTransactions || []), { id: Date.now().toString(), envelopeId: id, amount, type: 'out', date: new Date().toISOString(), note }]
        }));
    };
    const addExpense = (amount: number, category: string, note: string, source: MoneySource) => {
        setState(prev => ({
            ...prev,
            balance: { ...prev.balance, [source]: prev.balance[source] - amount },
            expenses: [{ id: Date.now().toString(), amount, category, note, source, date: new Date().toISOString() }, ...prev.expenses]
        }));
    };
    const addCategory = (label: string) => {
        const colors = ['bg-slate-100 text-slate-700', 'bg-indigo-100 text-indigo-700', 'bg-pink-100 text-pink-700', 'bg-amber-100 text-amber-700'];
        setState(prev => ({ ...prev, categories: [...prev.categories, { id: label.toLowerCase().replace(/\s+/g, '-'), label, color: colors[Math.floor(Math.random() * colors.length)] }] }));
    };
    const updatePayday = (day: number) => {
        setState(prev => ({ ...prev, settings: { ...prev.settings, payday: day } }));
    };

    // --- Render Login Screen ---
    if (isAuthChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Ładowanie...</div>;

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Wallet className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Domowy Budżet</h1>
                    <p className="text-slate-500 mb-8">Zaloguj się, aby zsynchronizować swoje finanse w chmurze.</p>
                    
                    <button 
                        onClick={handleLogin}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mb-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Zaloguj przez Google
                    </button>
                    
                    <button 
                        onClick={handleGuestLogin}
                        className="w-full bg-white text-slate-600 border border-slate-300 py-3 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        Wersja Demo (Tryb Gościa)
                    </button>
                    
                    <p className="mt-4 text-xs text-slate-300">Wymaga konfiguracji Firebase</p>
                </div>
            </div>
        );
    }

    if (!isAppLoaded) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-emerald-600">Pobieranie danych...</div>;

    return (
        <div className="min-h-screen bg-slate-50 max-w-lg mx-auto shadow-2xl overflow-hidden flex flex-col relative">
            
            {/* Header */}
            <header className="bg-white p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 px-6">
                <div className="w-6 flex items-center justify-center">
                    {user?.isGuest ? (
                        <span title="Tryb Gościa (Brak zapisu)" className="text-xs font-bold text-amber-500 border border-amber-200 bg-amber-50 px-1 rounded">DEMO</span>
                    ) : (
                        isSaving ? (
                            <Icons.CloudUpload className="w-5 h-5 text-amber-500 animate-pulse" />
                        ) : (
                            <Icons.CloudCheck className="w-5 h-5 text-emerald-500" />
                        )
                    )}
                </div>
                <h1 className="font-bold text-slate-800 text-lg">
                    {view === 'dashboard' && 'Twój Portfel'}
                    {view === 'fixed' && 'Rachunki'}
                    {view === 'envelopes' && 'Koperty'}
                    {view === 'expenses' && 'Wydatki'}
                    {view === 'history' && 'Historia'}
                    {view === 'settings' && 'Ustawienia'}
                </h1>
                <button onClick={() => setView('settings')} className="text-slate-400 hover:text-slate-800 w-6">
                    <Icons.Settings className="w-6 h-6" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 overflow-y-auto scrollbar-hide">
                {view === 'dashboard' && <Dashboard balance={state.balance} envelopes={state.envelopes} onAddIncome={addIncome} />}
                {view === 'fixed' && <FixedExpenses expenses={state.fixedExpenses} onToggle={toggleFixed} onAdd={addFixed} onDelete={deleteFixed} onReset={resetFixed} />}
                {view === 'envelopes' && <Envelopes envelopes={state.envelopes} transactions={state.envelopeTransactions} onAdd={addEnvelope} onDelete={deleteEnvelope} onTransfer={fundEnvelope} onSpend={spendFromEnvelope} />}
                {view === 'expenses' && <Expenses expenses={state.expenses} categories={state.categories} onAdd={addExpense} onAddCategory={addCategory} balance={state.balance} payday={state.settings.payday} />}
                {view === 'history' && <History expenses={state.expenses} categories={state.categories} payday={state.settings.payday} />}
                {view === 'settings' && <Settings payday={state.settings.payday} onPaydayChange={updatePayday} />}
            </main>

            {/* Bottom Navigation */}
            <nav className="bg-white border-t border-slate-200 fixed bottom-0 w-full max-w-lg pb-safe z-40">
                <div className="flex justify-around items-center h-16">
                    <button onClick={() => setView('dashboard')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.Home className="w-6 h-6" /><span className="text-[10px] font-medium">Start</span></button>
                    <button onClick={() => setView('expenses')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'expenses' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.Cart className="w-6 h-6" /><span className="text-[10px] font-medium">Zakupy</span></button>
                    <button onClick={() => setView('envelopes')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'envelopes' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.Envelope className="w-6 h-6" /><span className="text-[10px] font-medium">Koperty</span></button>
                    <button onClick={() => setView('fixed')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'fixed' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.CheckList className="w-6 h-6" /><span className="text-[10px] font-medium">Stałe</span></button>
                    <button onClick={() => setView('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'history' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.History className="w-6 h-6" /><span className="text-[10px] font-medium">Historia</span></button>
                </div>
            </nav>
        </div>
    );
};

export default App;
