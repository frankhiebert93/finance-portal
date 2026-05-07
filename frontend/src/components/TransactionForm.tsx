'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { saveTransactionAction } from '@/app/actions/saveTransaction'

export default function TransactionForm({ categories }: { categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    // New State for Cash vs Bank Logic
    const [mode, setMode] = useState<'transaction' | 'transfer'>('transaction')
    const [wallet, setWallet] = useState<'bank' | 'cash'>('bank')
    const [transferDirection, setTransferDirection] = useState<'bank_to_cash' | 'cash_to_bank'>('bank_to_cash')

    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [categoryId, setCategoryId] = useState(categories?.[0]?.id || '')

    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await saveTransactionAction(
                Number(amount), 
                note, 
                mode === 'transaction' ? categoryId : null, 
                mode, 
                wallet, 
                transferDirection
            )
            setIsOpen(false)
            setAmount('')
            setNote('')
        } catch (error) {
            console.error("Failed to save:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const modalContent = isOpen && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">

            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            ></div>

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Transaction vs Transfer Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => setMode('transaction')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'transaction' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Transaction
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('transfer')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'transfer' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Transfer
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* AMOUNT INPUT */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* DYNAMIC MIDDLE SECTION */}
                    {mode === 'transaction' ? (
                        <>
                            {/* Wallet Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Wallet</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${wallet === 'bank' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                        <input type="radio" name="wallet" value="bank" checked={wallet === 'bank'} onChange={() => setWallet('bank')} className="hidden" />
                                        <span className="font-bold">Bank</span>
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${wallet === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                        <input type="radio" name="wallet" value="cash" checked={wallet === 'cash'} onChange={() => setWallet('cash')} className="hidden" />
                                        <span className="font-bold">Cash</span>
                                    </label>
                                </div>
                            </div>

                            {/* Category Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                                <select
                                    required
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                                >
                                    {categories?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : (
                        /* Transfer Direction Selector */
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Direction</label>
                            <div className="flex gap-3">
                                <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${transferDirection === 'bank_to_cash' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                    <input type="radio" name="direction" value="bank_to_cash" checked={transferDirection === 'bank_to_cash'} onChange={() => setTransferDirection('bank_to_cash')} className="hidden" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">From Bank</span>
                                    <span className="font-black text-sm">→ To Cash</span>
                                </label>
                                <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${transferDirection === 'cash_to_bank' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                    <input type="radio" name="direction" value="cash_to_bank" checked={transferDirection === 'cash_to_bank'} onChange={() => setTransferDirection('cash_to_bank')} className="hidden" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">From Cash</span>
                                    <span className="font-black text-sm">→ To Bank</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* NOTE INPUT */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Note (Optional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            placeholder={mode === 'transfer' ? "e.g. ATM Withdrawal" : "e.g. Groceries at HEB"}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>

        </div>,
        document.body
    ) : null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm"
            >
                + Add Transaction
            </button>
            {modalContent}
        </>
    )
}
