'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { scanReceiptAction } from '@/app/actions/scanReceipt'
import { saveTransactionAction } from '@/app/actions/saveTransaction'

export default function TransactionForm({ categories }: { categories: any[] }) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isOpen, setIsOpen] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form State
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '')

    // Handle the Camera Capture
    const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsScanning(true)
        setIsOpen(true)

        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onloadend = async () => {
            const base64Image = reader.result as string

            const result = await scanReceiptAction(base64Image, categories)

            if (result.success) {
                setAmount(result.amount.toString())
                setNote(result.note)
                setCategoryId(result.categoryId)
            } else {
                alert("Couldn't read the receipt clearly. Please enter manually.")
            }
            setIsScanning(false)
        }
    }

    // Handle Final Save via Server Action
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        await saveTransactionAction(Number(amount), note, categoryId)

        setAmount('')
        setNote('')
        setIsOpen(false)
        setIsSaving(false)
    }

    return (
        <>
            <div className="flex gap-2">
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleCapture}
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-indigo-100 text-indigo-700 p-3 rounded-xl hover:bg-indigo-200 transition shadow-sm font-bold flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Scan
                </button>

                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition shadow-sm font-bold flex-1 md:flex-none"
                >
                    + Manual
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            {isScanning ? 'AI is reading receipt...' : 'Log Transaction'}
                        </h2>

                        <form onSubmit={handleSave} className={`space-y-4 ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Amount</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-bold text-xl">$</span>
                                    <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-black text-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
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
                                <button type="submit" disabled={isSaving || isScanning} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition shadow-sm">
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