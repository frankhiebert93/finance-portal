'use client'

import { useState } from 'react'
import { saveTransactionAction } from '@/app/actions/saveTransaction'

export default function TransactionForm({ categories }: { categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form State
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '')

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        // Strip out any commas the user typed before saving to the database
        const cleanAmount = Number(amount.replace(/,/g, ''))
        await saveTransactionAction(cleanAmount, note, categoryId)

        setAmount('')
        setNote('')
        setIsOpen(false)
        setIsSaving(false)
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition shadow-sm font-bold flex-1 md:flex-none w-full md:w-auto"
            >
                + Add Transaction
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Log Transaction</h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Amount</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-bold text-xl">$</span>
                                    {/* Changed type="number" to type="text" to allow commas */}
                                    <input type="text" inputMode="decimal" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-black text-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Merchant / Note</label>
                                <input type="text" required value={note} onChange={e => setNote(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" disabled={isSaving} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition shadow-sm">
                                    {isSaving ? 'Saving...' : 'Save Purchase'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}