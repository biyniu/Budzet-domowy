
import React, { useState } from 'react';
import { Icons } from '../constants';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface SettingsProps {
    payday: number;
    onPaydayChange: (day: number) => void;
    onUpdatePin?: (newPin: string) => Promise<boolean>;
    onDeleteAccount: () => Promise<void>;
    user?: any;
}

export const Settings: React.FC<SettingsProps> = ({ payday, onPaydayChange, onUpdatePin, onDeleteAccount, user }) => {
    // Pin Change State
    const [pin1, setPin1] = useState('');
    const [pin2, setPin2] = useState('');
    const [pinStatus, setPinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [pinMsg, setPinMsg] = useState('');

    // Delete Account State
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

    const handleLogout = () => {
        if(window.confirm("Czy na pewno chcesz się wylogować?")) {
            signOut(auth);
        }
    };

    const handleChangePin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinMsg('');
        setPinStatus('idle');

        if (pin1.length < 6) {
            setPinMsg("Hasło musi mieć minimum 6 znaków.");
            setPinStatus('error');
            return;
        }

        if (pin1 !== pin2) {
            setPinMsg("Hasła nie są identyczne.");
            setPinStatus('error');
            return;
        }

        if (onUpdatePin) {
            setPinStatus('loading');
            const success = await onUpdatePin(pin1);
            if (success) {
                setPinStatus('success');
                setPinMsg("Hasło zostało zmienione pomyślnie.");
                setPin1('');
                setPin2('');
            } else {
                setPinStatus('error');
                setPinMsg("Wystąpił błąd. Może być wymagane ponowne logowanie.");
            }
        }
    };

    const handleDeleteClick = async () => {
        if (deleteConfirmationText === 'USUŃ') {
            await onDeleteAccount();
        }
    };

    // Check if feature is available and user is not a guest
    const isCloudUser = user && !user.isGuest;
    const showPinChange = onUpdatePin && isCloudUser;

    return (
        <div className="pb-24">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Ustawienia</h2>

            {/* Payday Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <h3 className="font-semibold text-slate-800 mb-2">Cykl rozliczeniowy</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Wybierz dzień miesiąca, w którym otrzymujesz wypłatę. Od tego dnia będą liczone statystyki miesięczne oraz resetowane wydatki stałe.
                </p>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Dzień wypłaty (1-28)</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="28" 
                        value={payday} 
                        onChange={(e) => {
                            let val = parseInt(e.target.value);
                            if (val < 1) val = 1;
                            if (val > 28) val = 28; // Safe cap to avoid issues with Feb
                            onPaydayChange(val);
                        }}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-lg text-center outline-emerald-500"
                    />
                </div>
            </div>

            {/* Security Settings (Change Password) */}
            {showPinChange && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h3 className="font-semibold text-slate-800 mb-2">Bezpieczeństwo</h3>
                    <p className="text-sm text-slate-500 mb-4">Zmień swoje hasło do konta.</p>

                    <form onSubmit={handleChangePin} className="space-y-3">
                        <input 
                            type="password" 
                            placeholder="Nowe hasło"
                            value={pin1}
                            onChange={(e) => setPin1(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-emerald-500"
                        />
                         <input 
                            type="password" 
                            placeholder="Powtórz nowe hasło"
                            value={pin2}
                            onChange={(e) => setPin2(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-emerald-500"
                        />
                        
                        {pinMsg && (
                            <p className={`text-xs p-2 rounded ${pinStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {pinMsg}
                            </p>
                        )}

                        <button 
                            type="submit" 
                            disabled={pinStatus === 'loading'}
                            className="w-full py-2 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700 transition-colors"
                        >
                            {pinStatus === 'loading' ? 'Zmieniam...' : 'Zmień hasło'}
                        </button>
                    </form>
                </div>
            )}

            {/* Account Management */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
                        <Icons.CloudCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Konto użytkownika</h3>
                        <p className="text-xs text-emerald-600 font-medium">
                            {user?.isGuest ? 'Tryb lokalny (Demo)' : 'Połączono z chmurą'}
                        </p>
                    </div>
                </div>
                
                <p className="text-sm text-slate-500 mb-4">
                    {user?.isGuest 
                        ? 'Jesteś w trybie gościa. Twoje dane są zapisywane tylko w przeglądarce.'
                        : 'Jesteś zalogowany. Twoje dane są bezpiecznie synchronizowane z chmurą Google Firebase.'
                    }
                </p>
                
                {isCloudUser && (
                    <div className="text-xs text-slate-400 mb-4 break-all bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-bold">Twoje ID użytkownika:</span><br/>
                        {user.uid}
                        <br/><br/>
                        <span className="font-bold">Email:</span><br/>
                        {user.email}
                    </div>
                )}

                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-medium shadow-sm active:scale-95 transition-transform hover:bg-slate-200"
                >
                    Wyloguj się
                </button>
            </div>

            {/* DANGER ZONE - Delete Account */}
            {isCloudUser && (
                <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-100 mb-6">
                    <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                        <Icons.Trash className="w-5 h-5" /> Strefa niebezpieczna
                    </h3>
                    <p className="text-sm text-red-600 mb-4 opacity-80">
                        Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane (wydatki, historia, ustawienia) zostaną trwale usunięte z serwerów.
                    </p>
                    
                    {!isDeleteConfirming ? (
                        <button 
                            onClick={() => setIsDeleteConfirming(true)}
                            className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors"
                        >
                            Usuń konto trwale
                        </button>
                    ) : (
                        <div className="animate-in fade-in space-y-3">
                            <p className="text-xs font-bold text-red-800 uppercase">
                                Aby potwierdzić, wpisz słowo "USUŃ"
                            </p>
                            <input 
                                type="text"
                                value={deleteConfirmationText}
                                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                placeholder="Wpisz USUŃ"
                                className="w-full p-2 border border-red-300 rounded bg-white text-red-900 placeholder-red-200 outline-red-500"
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setIsDeleteConfirming(false); setDeleteConfirmationText(''); }}
                                    className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 rounded text-sm font-medium"
                                >
                                    Anuluj
                                </button>
                                <button 
                                    onClick={handleDeleteClick}
                                    disabled={deleteConfirmationText !== 'USUŃ'}
                                    className={`flex-1 py-2 text-white rounded text-sm font-bold ${deleteConfirmationText === 'USUŃ' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
                                >
                                    Potwierdzam
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="mt-6 text-center text-xs text-slate-300">
                Wersja aplikacji: 1.5.2
            </div>
        </div>
    );
};
