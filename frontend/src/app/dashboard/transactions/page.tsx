import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
    const supabase = await createClient()

    // Fetch all transactions, newest first
    const { data: transactions } = await supabase
        .from('transactions')
        .select(`id, amount, date, note, categories (name)`)
        .eq('workspace', 'personal')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

    // Inline Server Action to delete a mistake
    async function deleteTransaction(formData: FormData) {
        'use server'
        const id = formData.get('id') as string
        const supabase = await createClient()
        await supabase.from('transactions').delete().eq('id', id)
        revalidatePath('/dashboard/transactions')
        revalidatePath('/dashboard/personal')
    }

    const fmt = (num: number) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
                <h1 className="text-2xl font-extrabold text-slate-900">Ledger History</h1>
                <p className="text-slate-500 font-medium mt-1">Review and manage past transactions.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {(!transactions || transactions.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 font-bold">No transactions logged yet.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {transactions.map((tx: any) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                                            {tx.categories?.name || 'Uncategorized'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">{new Date(tx.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="font-bold text-slate-700 truncate">{tx.note}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="font-black text-lg text-slate-900">${fmt(tx.amount)}</span>

                                    {/* Delete Button Form */}
                                    <form action={deleteTransaction}>
                                        <input type="hidden" name="id" value={tx.id} />
                                        <button type="submit" className="p-2 text-rose-300 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition" title="Delete Transaction">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}