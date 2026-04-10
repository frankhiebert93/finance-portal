'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { saveTransactionAction } from '@/app/actions/saveTransaction'

export default function TransactionForm({ categories }: { categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [categoryId, setCategoryId] = useState(categories?.[0]?.id || '')

    // We need to check if the component has mounted on the client 
    // before we can teleport the modal to the document body.
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await saveTransactionAction(Number(amount), note, categoryId)
            setIsOpen(false)
            setAmount('')
            setNote('')
        } catch (error) {
            console.error("Failed to save:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // The modal UI is now separated so we can teleport it
    const modalContent = isOpen && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">

            {/* Dark blurred background overlay */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            ></div>

            {/* The actual popup box */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                <h2 className="text-xl font-black text-slate-800 mb-5">New Transaction</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
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

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Note (Optional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            placeholder="e.g. Groceries at HEB"
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
        document.body // <-- This is the magic teleport command
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