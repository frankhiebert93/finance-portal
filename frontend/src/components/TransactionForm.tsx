'use client'

import { useState } from 'react'
import { addTransaction } from '@/app/actions'

export default function TransactionForm({ categories }: { categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    const today = new Date().toISOString().split('T')[0]

    async function handleSubmit(formData: FormData) {
        setIsPending(true)
        try {
            await addTransaction(formData)
            setIsOpen(false)
        } catch (error) {
            alert("Failed to add transaction")
        } finally {
            setIsPending(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-md font-bold flex items-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                New Transaction
            </button>
        )
    }

    return (
        <div className="bg-slate-50 p-6 rounded-xl shadow-inner border border-slate-200 w-full md:w-auto mt-4 md:mt-0 relative">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                <h2 className="text-md font-bold text-slate-800">Log Entry</h2>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <form action={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-32">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Amount</label>
                    <input
                        type="number" step="0.01" name="amount" required placeholder="0.00"
                        className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-900"
                    />
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                    <select
                        name="category_id" required
                        className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-900 bg-white"
                    >
                        <option value="">Select...</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-40">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date</label>
                    <input
                        type="date" name="date" required defaultValue={today}
                        className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-900"
                    />
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Note</label>
                    <input
                        type="text" name="note" placeholder="Optional"
                        className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-900"
                    />
                </div>

                <button
                    type="submit" disabled={isPending}
                    className={`w-full md:w-auto px-6 py-2.5 rounded-md transition font-bold shadow-sm ${isPending ? 'bg-indigo-400 cursor-not-allowed text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                >
                    {isPending ? 'Saving...' : 'Save'}
                </button>
            </form>
        </div>
    )
}