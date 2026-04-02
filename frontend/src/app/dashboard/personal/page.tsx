import { createClient } from '@/lib/supabase'
import TransactionForm from '@/components/TransactionForm'

export const dynamic = 'force-dynamic'

export default async function PersonalDashboard() {
    const supabase = await createClient()

    const { data: categories } = await supabase.from('categories').select('*').eq('workspace', 'personal').order('name')
    const { data: transactions } = await supabase.from('transactions').select(`id, amount, date, note, categories (name, type)`).eq('workspace', 'personal').order('date', { ascending: false }).limit(50)

    let totalIncome = 0; let totalExpenses = 0;
    if (transactions) {
        transactions.forEach((tx: any) => {
            const type = tx.categories?.type
            if (type === 'income') totalIncome += Number(tx.amount)
            if (type === 'expense') totalExpenses += Number(tx.amount)
        })
    }

    return (
        <div className="bg-slate-100 font-sans min-h-screen">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

                {/* Header Area */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4 md:mt-0">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900">Monthly Overview</h1>
                        <p className="text-slate-500 font-medium mt-1">Household zero-based targets.</p>
                    </div>
                    <TransactionForm categories={categories || []} />
                </header>

                {/* Vibrant Metrics Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg border border-emerald-400 relative overflow-hidden">
                        <svg className="absolute top-4 right-4 w-12 h-12 text-emerald-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        <h3 className="text-sm font-bold text-emerald-100 uppercase tracking-wider">Total Income</h3>
                        <p className="text-4xl font-black text-white mt-2">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-2xl shadow-lg border border-rose-400 relative overflow-hidden">
                        <svg className="absolute top-4 right-4 w-12 h-12 text-rose-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>
                        <h3 className="text-sm font-bold text-rose-100 uppercase tracking-wider">Total Expenses</h3>
                        <p className="text-4xl font-black text-white mt-2">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg border border-indigo-500 relative overflow-hidden">
                        <svg className="absolute top-4 right-4 w-12 h-12 text-indigo-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
                        <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider">Left to Allocate</h3>
                        <p className="text-4xl font-black text-white mt-2">${(totalIncome - totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Structured Ledger Table */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">Recent Transactions</h2>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {!transactions || transactions.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-medium">
                                No transactions found. Log your first entry above.
                            </div>
                        ) : (
                            transactions.map((tx: any) => (
                                <div key={tx.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tx.categories?.type === 'expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {tx.categories?.type.substring(0, 3)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm">{tx.categories?.name || 'Uncategorized'}</span>
                                            <span className="text-xs text-slate-500 font-medium">{new Date(tx.date).toLocaleDateString()} {tx.note && <span className="text-slate-400 ml-1">• {tx.note}</span>}</span>
                                        </div>
                                    </div>
                                    <span className={`font-black text-md ${tx.categories?.type === 'expense' ? 'text-slate-800' : 'text-emerald-600'}`}>
                                        {tx.categories?.type === 'expense' ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}