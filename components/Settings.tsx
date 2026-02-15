
import React from 'react';
import { Icons } from '../constants';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface SettingsProps {
    payday: number;
    onPaydayChange: (day: number) => void;
}

export const Settings: React.FC<SettingsProps> = ({ payday, onPaydayChange }) => {
    
    const handleLogout = () => {
        if(window.confirm("Czy na pewno chcesz się wylogować?")) {
            signOut(auth);
        }
    };

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

            {/* Account Management */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <h3 className="font-semibold text-slate-800 mb-2">Konto i Dane</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Jesteś zalogowany. Twoje dane są bezpiecznie synchronizowane z chmurą <strong>Google Firebase</strong>.
                    <br/><br/>
                    Aplikacja nie tworzy plików na Vercel. Wszystkie kwoty znajdują się w bazie danych Firestore.
                </p>
                <div className="text-xs text-slate-400 mb-4 break-all bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="font-bold">Twoje ID użytkownika:</span><br/>
                    {auth.currentUser?.uid}
                    <br/><br/>
                    <span className="font-bold">Email:</span><br/>
                    {auth.currentUser?.email}
                </div>

                <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium shadow-sm active:scale-95 transition-transform"
                >
                    Wyloguj się
                </button>
            </div>
            
            <div className="mt-6 text-center text-xs text-slate-300">
                Wersja aplikacji: 1.4.0 (Fix: Error Handling)
            </div>
        </div>
    );
};
