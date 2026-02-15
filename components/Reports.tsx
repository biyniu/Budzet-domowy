
import React, { useMemo } from 'react';
import { ExpenseRecord, Category } from '../types';

interface ReportsProps {
    expenses: ExpenseRecord[];
    categories: Category[];
    payday: number;
}

export const Reports: React.FC<ReportsProps> = ({ expenses, categories, payday }) => {

    // Helper: Determine period string for a date (e.g., "2023-10")
    // If payday is 10th, then Oct 9th is period "2023-09"
    const getFinancialMonthDate = (date: Date) => {
        let year = date.getFullYear();
        let month = date.getMonth(); 
        if (date.getDate() < payday) {
            month--;
            if (month < 0) {
                month = 11;
                year--;
            }
        }
        return new Date(year, month, payday);
    };

    // --- Current Month Data ---
    const now = new Date();
    const currentPeriodStart = getFinancialMonthDate(now);
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const currentMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d >= currentPeriodStart && d < currentPeriodEnd;
    });

    const totalCurrentMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const categoryData = useMemo(() => {
        const map: Record<string, number> = {};
        currentMonthExpenses.forEach(e => {
            map[e.category] = (map[e.category] || 0) + e.amount;
        });
        
        return Object.entries(map)
            .map(([catId, amount]) => {
                const cat = categories.find(c => c.id === catId) || categories[0];
                return { 
                    catId, 
                    amount, 
                    label: cat.label, 
                    color: cat.color,
                    rawColor: getTailwindColorHex(cat.color) 
                };
            })
            .sort((a, b) => b.amount - a.amount);
    }, [currentMonthExpenses, categories]);


    // --- Forecast Logic ---
    const daysSinceStart = Math.floor((now.getTime() - currentPeriodStart.getTime()) / (1000 * 3600 * 24)) + 1;
    const daysInMonth = 30; // Approx
    const dailyAverage = daysSinceStart > 0 ? totalCurrentMonth / daysSinceStart : 0;
    const projectedTotal = dailyAverage * daysInMonth;


    // --- Historical Trend (Last 6 Months) ---
    const trendData = useMemo(() => {
        const data: { label: string, amount: number, isCurrent: boolean }[] = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentPeriodStart);
            d.setMonth(d.getMonth() - i);
            
            const start = d;
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);

            const total = expenses
                .filter(e => {
                    const ed = new Date(e.date);
                    return ed >= start && ed < end;
                })
                .reduce((sum, e) => sum + e.amount, 0);

            const monthName = start.toLocaleDateString('pl-PL', { month: 'short' });
            data.push({ 
                label: monthName, 
                amount: total,
                isCurrent: i === 0
            });
        }
        return data;
    }, [expenses, currentPeriodStart]);

    const maxTrendAmount = Math.max(...trendData.map(d => d.amount), 1);

    // --- Simple SVG Pie Chart Component ---
    const PieChart = () => {
        if (totalCurrentMonth === 0) return (
            <div className="flex items-center justify-center h-48 text-slate-300 text-sm">Brak danych</div>
        );

        let cumulativePercent = 0;
        
        // Prepare slices
        const slices = categoryData.map(d => {
            const percent = d.amount / totalCurrentMonth;
            const startX = Math.cos(2 * Math.PI * cumulativePercent);
            const startY = Math.sin(2 * Math.PI * cumulativePercent);
            cumulativePercent += percent;
            const endX = Math.cos(2 * Math.PI * cumulativePercent);
            const endY = Math.sin(2 * Math.PI * cumulativePercent);
            
            // Large arc flag
            const largeArcFlag = percent > 0.5 ? 1 : 0;
            
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
            
            return (
                <path 
                    key={d.catId} 
                    d={pathData} 
                    fill={d.rawColor} 
                    stroke="white" 
                    strokeWidth="0.05"
                />
            );
        });

        return (
            <div className="flex gap-4 items-center">
                <div className="w-32 h-32 shrink-0">
                    <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
                        {slices}
                    </svg>
                </div>
                <div className="flex-1 space-y-1">
                    {categoryData.slice(0, 4).map(d => (
                        <div key={d.catId} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.rawColor }}></div>
                                <span className="text-slate-600 truncate max-w-[80px]">{d.label}</span>
                            </div>
                            <span className="font-bold text-slate-800">{((d.amount / totalCurrentMonth) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                    {categoryData.length > 4 && <div className="text-xs text-slate-400 pl-4">+ {categoryData.length - 4} inne...</div>}
                </div>
            </div>
        );
    };

    return (
        <div className="pb-24 space-y-6">
            
            {/* Forecast Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <h3 className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Prognoza na koniec miesiąca</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{projectedTotal.toFixed(0)} zł</span>
                    <span className="text-indigo-200 text-sm">szacowane</span>
                </div>
                <p className="text-indigo-100 text-xs mt-2 opacity-80">
                    Na podstawie średniej dziennej ({dailyAverage.toFixed(0)} zł). 
                    Obecnie wydałeś {totalCurrentMonth.toFixed(0)} zł ({((daysSinceStart/daysInMonth)*100).toFixed(0)}% czasu).
                </p>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
            </div>

            {/* Pie Chart Section */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-slate-800 font-bold mb-4">Struktura wydatków</h3>
                <PieChart />
            </div>

            {/* Bar Chart Section */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-slate-800 font-bold mb-4">Ostatnie 6 miesięcy</h3>
                <div className="flex items-end justify-between h-32 gap-2">
                    {trendData.map((d, i) => {
                        const heightPercent = (d.amount / maxTrendAmount) * 100;
                        return (
                            <div key={i} className="flex flex-col items-center flex-1 group">
                                <div className="relative w-full flex justify-center h-full items-end">
                                    <div 
                                        className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ${d.isCurrent ? 'bg-emerald-400' : 'bg-slate-200 group-hover:bg-slate-300'}`}
                                        style={{ height: `${heightPercent}%` }}
                                    ></div>
                                    {/* Tooltipish value */}
                                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-slate-800 text-white px-1 rounded">
                                        {d.amount.toFixed(0)}
                                    </div>
                                </div>
                                <span className={`text-[10px] mt-2 font-medium ${d.isCurrent ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {d.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


// Helper to extract hex color from tailwind class roughly
// This is a simplification. Ideally, we would store hex in Category, 
// but since we store tailwind classes like 'bg-green-100', we map them here for SVG.
const getTailwindColorHex = (tailwindClass: string): string => {
    if (tailwindClass.includes('green')) return '#4ade80'; // green-400
    if (tailwindClass.includes('blue')) return '#60a5fa'; // blue-400
    if (tailwindClass.includes('orange')) return '#fb923c'; // orange-400
    if (tailwindClass.includes('gray')) return '#9ca3af'; // gray-400
    if (tailwindClass.includes('red')) return '#f87171'; // red-400
    if (tailwindClass.includes('purple')) return '#c084fc'; // purple-400
    if (tailwindClass.includes('slate')) return '#94a3b8'; // slate-400
    if (tailwindClass.includes('indigo')) return '#818cf8'; // indigo-400
    if (tailwindClass.includes('pink')) return '#f472b6'; // pink-400
    if (tailwindClass.includes('amber')) return '#fbbf24'; // amber-400
    return '#cbd5e1'; // slate-300 default
};
