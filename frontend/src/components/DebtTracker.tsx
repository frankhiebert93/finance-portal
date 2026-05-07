'use client'

import { useState } from 'react'
import { payDebtAction } from '@/app/actions/payDebt'

export default function DebtTracker({ debts }: { debts: any[] }) {
  const [exchangeRate, setExchangeRate] = useState<number>(16.50) 
  const [payments, setPayments] = useState<Record<string, string>>({})
  const [isPaying, setIsPaying] = useState<Record<string, boolean>>({})
  const now = new Date()

  let totalDebtAmountMXN = 0; 
  let maxMonthsToPayoff = 0; 
  let globalWillNeverPayOff = false;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePayment = async (debtId: string, currentBalance: number) => {
    const amt = Number(payments[debtId])
    if (!amt || amt <= 0) return

    setIsPaying(prev => ({ ...prev, [debtId]: true }))
    await payDebtAction(debtId, currentBalance, amt)
    setPayments(prev => ({ ...prev, [debtId]: '' }))
    setIsPaying(prev => ({ ...prev, [debtId]: false }))
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
      
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
          const originalAmount = Number(debt.original_amount || 0);
          const balance = Number(debt.current_balance || 0);
          const apr = Number(debt.interest_rate || 0);
          const payment = Number(debt.min_payment || 0);
          const currency = String(debt.currency || 'MXN').trim().toUpperCase();
          const frequency = debt.payment_frequency || 'monthly';
          
          // Progress Bar Math
          const percentPaid = originalAmount > 0 ? Math.max(0, Math.min(100, ((originalAmount - balance) / originalAmount) * 100)) : 0;

          // Amortization Math (Double the payment if bi-weekly)
          const effectivePayment = frequency === 'bi-weekly' ? payment * 2 : payment;
          const monthlyRate = (apr / 100) / 12;
          const monthlyInterest = balance * monthlyRate;
          
          const balanceInMXN = currency === 'USD' ? balance * exchangeRate : balance;
          totalDebtAmountMXN += balanceInMXN;
          
          let payoffMessage = "";
          if (balance <= 0) payoffMessage = "Paid! 🎉";
          else if (effectivePayment <= monthlyInterest) {
            payoffMessage = "Negative Amortization";
            globalWillNeverPayOff = true;
          } else {
            const m = -Math.log(1 - (balance * monthlyRate) / effectivePayment) / Math.log(1 + monthlyRate);
            if (m > maxMonthsToPayoff) maxMonthsToPayoff = m;
            const d = new Date(); d.setMonth(d.getMonth() + Math.ceil(m));
            payoffMessage = `Est. Payoff: ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
          }

          return (
            <div key={debt.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-bl-xl ${currency === 'USD' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                  {currency}
                </div>

                <div className="flex justify-between items-start pt-1 mb-3">
                  <h3 className="font-extrabold text-slate-900 pr-12">{debt.name}</h3>
                  <div className="text-right">
                    <span className="font-black text-xl text-rose-500 block leading-none">${fmt(balance)}</span>
                  </div>
                </div>

                {originalAmount > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      <span>Orig: ${fmt(originalAmount)}</span>
                      <span className="text-emerald-500">{fmt(percentPaid)}% Paid</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-400 h-full transition-all duration-1000" style={{ width: `${percentPaid}%` }} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 uppercase mb-3">
                  <div>APR: <span className="text-slate-900">{apr}%</span></div>
                  <div>Pay: <span className="text-slate-900">${fmt(payment)} <span className="text-[8px] opacity-60">({frequency})</span></span></div>
                </div>

                <div className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>{payoffMessage}</span>
                  {currency === 'USD' && (
                    <span className="text-slate-400">≈ ${fmt(balanceInMXN)} MXN</span>
                  )}
                </div>
              </div>

              {/* Apply Payment Action Bar */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Payment Amt"
                    value={payments[debt.id] || ''}
                    onChange={(e) => setPayments({...payments, [debt.id]: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-7 pr-2 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePayment(debt.id, balance)}
                  disabled={isPaying[debt.id] || !payments[debt.id]}
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 px-5 rounded-lg font-bold transition-all text-sm"
                >
                  {isPaying[debt.id] ? '...' : 'Apply'}
                </button>
              </div>

            </div>
          )
        })}
      </div>

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
