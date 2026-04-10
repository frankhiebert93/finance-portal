'use client'

import { useState } from 'react'

export default function DebtTracker({ debts }: { debts: any[] }) {
    // Sets a default rate, you can adjust this anytime in the UI
    const [exchangeRate, setExchangeRate] = useState<number>(16.50)
    const now = new Date()

    let totalDebtAmountMXN = 0;
    let maxMonthsToPayoff = 0;
    let globalWillNeverPayOff = false;

    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">

            {/* Header & Live Exchange Rate Input */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-lg font-bold text-slate-800">Active Debt Tracker</h2>

                <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100 shadow-inner">
                    <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">USD to MXN Rate</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">$</span>
                        <input
                            type="number"
                            step="0.01"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                            className="w-24 bg-white border border-indigo-200 rounded-lg py-1.5 pl-7 pr-2 font-black text-indigo-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {debts?.map((debt: any) => {
                    const balance = Number(debt.current_balance || 0);
                    const apr = Number(debt.interest_rate || 0);
                    const payment = Number(debt.min_payment || 0);
                    const currency = debt.currency || 'MXN'; // Defaults to MXN if left blank

                    const monthlyRate = (apr / 100) / 12;
                    const monthlyInterest = balance * monthlyRate;

                    // Calculate conversion for the Master Total
                    const balanceInMXN = currency === 'USD' ? balance * exchangeRate : balance;
                    totalDebtAmountMXN += balanceInMXN;

                    let payoffMessage = "";
                    if (balance <= 0) payoffMessage = "Paid! 🎉";
                    else if (payment <= monthlyInterest) {
                        payoffMessage = "Negative Amortization";
                        globalWillNeverPayOff = true;
                    } else {
                        const m = -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate);
                        if (m > maxMonthsToPayoff) maxMonthsToPayoff = m;
                        const d = new Date(); d.setMonth(d.getMonth() + Math.ceil(m));
                        payoffMessage = `Est. Payoff: ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                    }

                    return (
                        <div key={debt.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-sm relative overflow-hidden">
                            {/* Currency Badge */}
                            <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-bl-xl ${currency === 'USD' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                                {currency}
                            </div>

                            <div className="flex justify-between items-start pt-2">
                                <h3 className="font-extrabold text-slate-900 pr-12">{debt.name}</h3>
                                <span className="font-black text-lg text-rose-500 whitespace-nowrap">
                                    ${fmt(balance)}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 uppercase">
                                <div>APR: <span className="text-slate-900">{apr}%</span></div>
                                <div>Payment: <span className="text-slate-900">${fmt(payment)}</span></div>
                            </div>
                            <div className="text-xs font-bold text-slate-700 pt-2 border-t border-slate-100 flex justify-between">
                                <span>{payoffMessage}</span>
                                {currency === 'USD' && (
                                    <span className="text-slate-400">≈ ${fmt(balanceInMXN)} MXN</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Master Debt Summary */}
            <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
                <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Owed (MXN Equivalent)</span>
                    <span className="text-3xl font-black text-rose-400">${fmt(totalDebtAmountMXN)}</span>
                </div>
                <div className="text-center md:text-right">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Household Freedom</span>
                    <span className="text-xl font-bold text-emerald-400">
                        {globalWillNeverPayOff ? 'Check Payments' : (totalDebtAmountMXN > 0 ? new Date(now.getFullYear(), now.getMonth() + Math.ceil(maxMonthsToPayoff)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Debt Free!')}
                    </span>
                </div>
            </div>

        </div>
    )
}