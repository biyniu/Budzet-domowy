
import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { FixedExpenses } from './components/FixedExpenses';
import { Envelopes } from './components/Envelopes';
import { Expenses } from './components/Expenses';
import { History } from './components/History';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { AppState, ViewState, FixedExpense, MoneySource, IncomeRecord } from './types';
import { Icons, DEFAULT_CATEGORIES } from './constants';

// Firebase
import { auth, db } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    sendPasswordResetEmail,
    User,
    updateProfile,
    updatePassword,
    deleteUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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
    incomes: [],
    categories: DEFAULT_CATEGORIES,
    settings: {
        payday: 1, 
        lastResetDate: new Date().toISOString() 
    }
};

const App: React.FC = () => {
    const [view, setView] = useState<ViewState>('dashboard');
    
    // 1. INSTANT LOAD: Initialize state from LocalStorage if available
    const [state, setState] = useState<AppState>(() => {
        try {
            const saved = localStorage.getItem('budget_data');
            return saved ? JSON.parse(saved) : INITIAL_STATE;
        } catch (e) {
            return INITIAL_STATE;
        }
    });
    
    // Auth & Loading state
    const [user, setUser] = useState<User | any | null>(null);
    // If we have local data, we consider app loaded immediately (optimistic UI)
    const [isAppLoaded, setIsAppLoaded] = useState(() => !!localStorage.getItem('budget_data')); 
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Login Form State
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [savedEmail, setSavedEmail] = useState<string>(() => localStorage.getItem('budget_user_email') || '');
    const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem('budget_user_email') || '');
    const [loginPassword, setLoginPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // --- Authentication & Data Sync ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (user?.isGuest) return;

            setUser(currentUser);
            setIsAuthChecking(false);

            if (currentUser) {
                // User logged in - Fetch newest data from Firestore in background
                try {
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const cloudData = docSnap.data() as AppState;
                        // Migrations/Safety checks
                        if (!cloudData.settings) cloudData.settings = INITIAL_STATE.settings;
                        if (!cloudData.categories) cloudData.categories = DEFAULT_CATEGORIES;
                        if (!cloudData.incomes) cloudData.incomes = []; // Migration for existing users
                        
                        setState(cloudData);
                        // Update local cache immediately
                        localStorage.setItem('budget_data', JSON.stringify(cloudData));
                    } else {
                        // First time user on this cloud account
                        if (!localStorage.getItem('budget_data')) {
                            await setDoc(docRef, INITIAL_STATE);
                            setState(INITIAL_STATE);
                        } else {
                            await setDoc(docRef, state);
                        }
                    }
                } catch (error: any) {
                    console.error("Error fetching cloud data:", error);
                } finally {
                    setIsAppLoaded(true);
                }
            } else {
                if (!savedEmail) {
                    setIsAppLoaded(false);
                }
            }
        });

        return () => unsubscribe();
    }, [user?.isGuest]);

    // --- Data Persistence (Local + Cloud) ---
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (!isFirstRun.current) {
             localStorage.setItem('budget_data', JSON.stringify(state));
        }

        if (!user || !isAppLoaded) return;
        if (user.isGuest) return;

        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const saveToCloud = async () => {
            setIsSaving(true);
            try {
                const docRef = doc(db, 'users', user.uid);
                await setDoc(docRef, state);
            } catch (error) {
                console.error("Error saving data to cloud:", error);
            } finally {
                setTimeout(() => setIsSaving(false), 500); 
            }
        };

        const timeoutId = setTimeout(saveToCloud, 2000); 
        return () => clearTimeout(timeoutId);

    }, [state, user, isAppLoaded]);


    // --- Custom Auth Handlers ---
    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');
        setAuthLoading(true);

        const email = loginEmail.trim();
        
        if (loginPassword.length < 6) {
            setAuthError('Hasło musi mieć minimum 6 znaków.');
            setAuthLoading(false);
            return;
        }

        try {
            if (authMode === 'login') {
                await signInWithEmailAndPassword(auth, email, loginPassword);
                localStorage.setItem('budget_user_email', email);
                setSavedEmail(email);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, loginPassword);
                // Set Display Name as the part before @
                const displayName = email.split('@')[0];
                await updateProfile(userCredential.user, {
                    displayName: displayName
                });
                localStorage.setItem('budget_user_email', email);
                setSavedEmail(email);
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                setAuthError('Błędny email lub hasło.');
            } else if (error.code === 'auth/email-already-in-use') {
                setAuthError('Ten email jest już zajęty.');
            } else if (error.code === 'auth/weak-password') {
                setAuthError('Hasło jest za słabe (min. 6 znaków).');
            } else if (error.code === 'auth/invalid-email') {
                setAuthError('Nieprawidłowy format adresu email.');
            } else {
                setAuthError('Błąd: ' + error.message);
            }
        } finally {
            setAuthLoading(false);
        }
    };
    
    // Password Reset Logic
    const handleResetPassword = async () => {
        const email = loginEmail.trim();
        if (!email) {
            setAuthError("Wpisz adres email, aby zresetować hasło.");
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            setAuthError("Wpisz prawidłowy adres email.");
            return;
        }

        setAuthLoading(true);
        setAuthError('');
        setAuthSuccess('');

        try {
            await sendPasswordResetEmail(auth, email);
            setAuthSuccess(`Link do resetu hasła został wysłany na: ${email}`);
            setAuthLoading(false);
        } catch (error: any) {
            setAuthLoading(false);
            if (error.code === 'auth/user-not-found') {
                setAuthError("Nie znaleziono użytkownika o takim adresie email.");
            } else if (error.code === 'auth/invalid-email') {
                setAuthError("Nieprawidłowy format adresu email.");
            } else {
                setAuthError("Błąd wysyłania emaila: " + error.message);
            }
        }
    };
    
    // Change PIN/Password Logic
    const handleChangePin = async (newPin: string): Promise<boolean> => {
        if (!user || user.isGuest) return false;
        try {
            await updatePassword(user, newPin);
            return true;
        } catch (e: any) {
            console.error("PIN Change error", e);
            alert("Błąd zmiany hasła: " + e.message); 
            return false;
        }
    };

    // Delete Account Logic
    const handleDeleteAccount = async (): Promise<void> => {
        if (!user || user.isGuest) return;

        try {
            const uid = user.uid;
            
            // 1. Delete Firestore Data
            await deleteDoc(doc(db, 'users', uid));
            
            // 2. Delete Authentication Account
            // Note: This requires the user to have signed in recently.
            await deleteUser(user);
            
            // 3. Clean Local Data
            localStorage.removeItem('budget_data');
            localStorage.removeItem('budget_user_email');
            
            // 4. Reset State
            setUser(null);
            setState(INITIAL_STATE);
            setSavedEmail('');
            setLoginEmail('');
            setLoginPassword('');
            setView('dashboard');
            
            alert("Twoje konto i wszystkie dane zostały usunięte.");
            
        } catch (error: any) {
            console.error("Delete Account Error:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Ze względów bezpieczeństwa, aby usunąć konto, musisz się wylogować i zalogować ponownie.");
                auth.signOut();
            } else {
                alert("Wystąpił błąd podczas usuwania konta: " + error.message);
            }
        }
    };

    const handleGuestLogin = () => {
        const guestUser = {
            uid: 'guest_demo_user',
            email: 'demo@gosc.local',
            displayName: 'Gość',
            isGuest: true
        };
        setUser(guestUser);
        setState(INITIAL_STATE);
        setIsAppLoaded(true);
        setIsAuthChecking(false);
    };

    const handleSwitchAccount = () => {
        setSavedEmail('');
        setLoginEmail('');
        localStorage.removeItem('budget_user_email');
        localStorage.removeItem('budget_data'); 
        setLoginPassword('');
        auth.signOut();
    };


    // --- Logic Wrappers ---
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

    // Handlers (Reduced for brevity - same logic as before, just kept in place)
    const addIncome = (amount: number, source: 'bank' | 'cash', dateStr?: string) => {
        const entryDate = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
        const newIncome: IncomeRecord = { id: Date.now().toString(), amount, date: entryDate, source };
        setState(prev => ({
            ...prev,
            balance: { ...prev.balance, [source]: prev.balance[source] + amount },
            incomes: [newIncome, ...(prev.incomes || [])]
        }));
    };
    
    const editIncome = (id: string, amount: number, source: MoneySource, date: string) => {
        setState(prev => {
            const oldIncome = prev.incomes.find(i => i.id === id);
            if (!oldIncome) return prev;
            let newBank = prev.balance.bank;
            let newCash = prev.balance.cash;
            if (oldIncome.source === 'bank') newBank -= oldIncome.amount; else newCash -= oldIncome.amount;
            if (source === 'bank') newBank += amount; else newCash += amount;
            return {
                ...prev,
                balance: { bank: newBank, cash: newCash },
                incomes: prev.incomes.map(i => i.id === id ? { ...i, amount, source, date } : i)
            };
        });
    };

    const deleteIncome = (id: string) => {
        if(!window.confirm("Czy na pewno chcesz usunąć ten wpływ?")) return;
        setState(prev => {
            const inc = prev.incomes.find(i => i.id === id);
            if (!inc) return prev;
            let newBank = prev.balance.bank;
            let newCash = prev.balance.cash;
            if (inc.source === 'bank') newBank -= inc.amount; else newCash -= inc.amount;
            return {
                ...prev,
                balance: { bank: newBank, cash: newCash },
                incomes: prev.incomes.filter(i => i.id !== id)
            };
        });
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
    const addFixed = (name: string, amount: number, source: MoneySource, dueDate?: number) => {
        setState(prev => ({ ...prev, fixedExpenses: [...prev.fixedExpenses, { id: Date.now().toString(), name, amount, isPaid: false, source, dueDate }] }));
    };
    const editFixed = (id: string, name: string, amount: number, source: MoneySource, dueDate?: number) => {
        setState(prev => ({
            ...prev,
            fixedExpenses: prev.fixedExpenses.map(f => f.id === id ? { ...f, name, amount, source, dueDate } : f)
        }));
    };
    const deleteFixed = (id: string) => {
        setState(prev => ({ ...prev, fixedExpenses: prev.fixedExpenses.filter(f => f.id !== id) }));
    };
    const resetFixed = () => {
        if(window.confirm("Zresetować status rachunków?")) setState(prev => ({ ...prev, fixedExpenses: prev.fixedExpenses.map(f => ({ ...f, isPaid: false })) }));
    };
    const addEnvelope = (name: string, description: string, targetAmount: number = 0) => {
        setState(prev => ({ ...prev, envelopes: [...prev.envelopes, { id: Date.now().toString(), name, description, allocated: 0, targetAmount }] }));
    };
    const editEnvelope = (id: string, name: string, description: string, allocated: number, targetAmount: number = 0) => {
        setState(prev => ({
            ...prev,
            envelopes: prev.envelopes.map(e => e.id === id ? { ...e, name, description, allocated, targetAmount } : e)
        }));
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
    const editExpense = (id: string, amount: number, category: string, note: string, source: MoneySource) => {
        setState(prev => {
             const oldExp = prev.expenses.find(e => e.id === id);
             if (!oldExp) return prev;
             let newBank = prev.balance.bank;
             let newCash = prev.balance.cash;
             if (oldExp.source === 'bank') newBank += oldExp.amount; else newCash += oldExp.amount;
             if (source === 'bank') newBank -= amount; else newCash -= amount;
             return {
                 ...prev,
                 balance: { bank: newBank, cash: newCash },
                 expenses: prev.expenses.map(e => e.id === id ? { ...e, amount, category, note, source } : e)
             };
        });
    };
    const deleteExpense = (id: string) => {
        if(window.confirm("Usunąć ten wydatek?")) {
            setState(prev => {
                const exp = prev.expenses.find(e => e.id === id);
                if (!exp) return prev;
                let newBank = prev.balance.bank;
                let newCash = prev.balance.cash;
                if (exp.source === 'bank') newBank += exp.amount; else newCash += exp.amount;
                return {
                    ...prev,
                    balance: { bank: newBank, cash: newCash },
                    expenses: prev.expenses.filter(e => e.id !== id)
                };
            });
        }
    };
    const addCategory = (label: string) => {
        const colors = ['bg-slate-100 text-slate-700', 'bg-indigo-100 text-indigo-700', 'bg-pink-100 text-pink-700', 'bg-amber-100 text-amber-700'];
        setState(prev => ({ ...prev, categories: [...prev.categories, { id: label.toLowerCase().replace(/\s+/g, '-'), label, color: colors[Math.floor(Math.random() * colors.length)] }] }));
    };
    const updatePayday = (day: number) => {
        setState(prev => ({ ...prev, settings: { ...prev.settings, payday: day } }));
    };

    if (isAuthChecking && !isAppLoaded) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Ładowanie...</div>;

    if (!user && !isAppLoaded) {
        const isReturningUser = authMode === 'login' && savedEmail;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Wallet className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Domowy Budżet</h1>
                    <p className="text-slate-500 mb-6 text-sm">Twoje finanse w jednym miejscu</p>
                    
                    <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                        <button 
                            onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Logowanie
                        </button>
                        <button 
                            onClick={() => { 
                                setAuthMode('register'); 
                                setAuthError(''); 
                                setAuthSuccess('');
                                if (savedEmail) {
                                    setLoginEmail('');
                                }
                            }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Rejestracja
                        </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
                        {isReturningUser ? (
                            <div className="text-center mb-6">
                                <p className="text-sm text-slate-400">Witaj ponownie,</p>
                                <p className="text-lg font-bold text-emerald-600 mb-2 truncate px-4">{savedEmail}</p>
                                <button 
                                    type="button" 
                                    onClick={handleSwitchAccount}
                                    className="text-xs text-slate-400 underline hover:text-slate-600"
                                >
                                    To nie Ty? Zmień konto
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adres Email</label>
                                <input 
                                    type="email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    placeholder="np. jan.kowalski@gmail.com"
                                    className="w-full p-3 border border-slate-300 rounded-xl outline-emerald-500 bg-slate-50 focus:bg-white transition-colors"
                                    required
                                />
                            </div>
                        )}
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">
                                    Hasło / PIN
                                </label>
                                {authMode === 'login' && !isReturningUser && (
                                    <button 
                                        type="button"
                                        onClick={handleResetPassword}
                                        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                                    >
                                        Nie pamiętam hasła
                                    </button>
                                )}
                            </div>
                            <input 
                                type="password" 
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="Min. 6 znaków"
                                className="w-full p-3 border border-slate-300 rounded-xl outline-emerald-500 bg-slate-50 focus:bg-white transition-colors tracking-widest text-lg font-bold"
                                required
                            />
                            {isReturningUser && (
                                <div className="text-right mt-1">
                                     <button 
                                        type="button"
                                        onClick={handleResetPassword}
                                        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                                    >
                                        Nie pamiętam hasła
                                    </button>
                                </div>
                            )}
                        </div>

                        {authError && (
                            <div className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg border border-red-100">
                                {authError}
                            </div>
                        )}
                        
                        {authSuccess && (
                            <div className="text-green-600 text-xs text-center bg-green-50 p-2 rounded-lg border border-green-100">
                                {authSuccess}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={authLoading}
                            className={`w-full bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${authLoading ? 'opacity-70' : ''}`}
                        >
                            {authLoading ? 'Przetwarzanie...' : (authMode === 'login' ? 'Wejdź' : 'Utwórz konto')}
                        </button>
                    </form>
                    
                    <div className="mt-6 border-t border-slate-100 pt-4">
                        <button 
                            onClick={handleGuestLogin}
                            className="text-slate-400 hover:text-emerald-600 text-xs font-medium transition-colors"
                        >
                            Wersja Demo (Tryb Gościa)
                        </button>
                    </div>
                </div>
                <div className="mt-8 text-[10px] text-slate-300 max-w-xs text-center">
                    Aplikacja zapamiętuje Twój email na tym urządzeniu.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 max-w-lg mx-auto shadow-2xl overflow-hidden flex flex-col relative">
            
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
                    {view === 'reports' && 'Raporty'}
                    {view === 'history' && 'Historia'}
                    {view === 'settings' && 'Ustawienia'}
                </h1>
                <button onClick={() => setView('settings')} className="text-slate-400 hover:text-slate-800 w-6">
                    <Icons.Settings className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 p-4 overflow-y-auto scrollbar-hide">
                {view === 'dashboard' && <Dashboard balance={state.balance} envelopes={state.envelopes} incomes={state.incomes || []} payday={state.settings.payday} onAddIncome={addIncome} />}
                {view === 'fixed' && <FixedExpenses expenses={state.fixedExpenses} onToggle={toggleFixed} onAdd={addFixed} onEdit={editFixed} onDelete={deleteFixed} onReset={resetFixed} />}
                {view === 'envelopes' && <Envelopes envelopes={state.envelopes} transactions={state.envelopeTransactions} onAdd={addEnvelope} onEdit={editEnvelope} onDelete={deleteEnvelope} onTransfer={fundEnvelope} onSpend={spendFromEnvelope} />}
                {view === 'expenses' && <Expenses expenses={state.expenses} categories={state.categories} onAdd={addExpense} onEdit={editExpense} onDelete={deleteExpense} onAddCategory={addCategory} balance={state.balance} payday={state.settings.payday} />}
                {view === 'reports' && <Reports expenses={state.expenses} incomes={state.incomes || []} categories={state.categories} payday={state.settings.payday} />}
                {view === 'history' && (
                    <History 
                        expenses={state.expenses} 
                        incomes={state.incomes || []} 
                        categories={state.categories} 
                        payday={state.settings.payday} 
                        onEditExpense={editExpense}
                        onDeleteExpense={deleteExpense}
                        onEditIncome={editIncome}
                        onDeleteIncome={deleteIncome}
                    />
                )}
                {view === 'settings' && <Settings payday={state.settings.payday} onPaydayChange={updatePayday} onUpdatePin={handleChangePin} onDeleteAccount={handleDeleteAccount} user={user} />}
            </main>

            <nav className="bg-white border-t border-slate-200 fixed bottom-0 w-full max-w-lg pb-safe z-40">
                <div className="flex justify-around items-center h-16">
                    <button onClick={() => setView('dashboard')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.Home className="w-6 h-6" /><span className="text-[9px] font-medium">Start</span></button>
                    <button onClick={() => setView('expenses')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'expenses' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.Cart className="w-6 h-6" /><span className="text-[9px] font-medium">Zakupy</span></button>
                    <button onClick={() => setView('fixed')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'fixed' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.CheckList className="w-6 h-6" /><span className="text-[9px] font-medium">Stałe</span></button>
                    <button onClick={() => setView('envelopes')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'envelopes' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.Envelope className="w-6 h-6" /><span className="text-[9px] font-medium">Koperty</span></button>
                    <button onClick={() => setView('history')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'history' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.History className="w-6 h-6" /><span className="text-[9px] font-medium">Historia</span></button>
                    <button onClick={() => setView('reports')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'reports' ? 'text-emerald-600' : 'text-slate-400'}`}><Icons.Chart className="w-6 h-6" /><span className="text-[9px] font-medium">Raporty</span></button>
                </div>
            </nav>
        </div>
    );
};

export default App;
