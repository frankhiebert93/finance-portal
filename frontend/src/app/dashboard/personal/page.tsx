import { createClient } from '@/lib/supabase'
import TransactionForm from '@/components/TransactionForm'
import SpendingChart from '@/components/SpendingChart'

export const dynamic = 'force-dynamic'

export default async function PersonalDashboard() {
    const supabase = await createClient()

    // Fetch data
    const { data: categories } = await supabase.from('categories').select('*').eq('workspace', 'personal').order('name')
    const { data: transactions } = await supabase.from('transactions').select(`id, amount, date, note, categories (name, type)`).eq('workspace', 'personal').order('date', { ascending: false })
    const { data: buckets } = await supabase.from('savings_buckets').select('*').eq('workspace', 'personal').order('created_at')

    // Calculate High-Level Totals & Category Spending
    let totalIncome = 0;
    let totalExpenses = 0;
    const expenseTotals: Record<string, number> = {};

    if (transactions) {
        transactions.forEach((tx: any) => {
            const type = tx.categories?.type
            const amount = Number(tx.amount)
            const catName = tx.categories?.name || 'Uncategorized'

            if (type === 'income') {
                totalIncome += amount
            } else if (type === 'expense') {
                totalExpenses += amount
                expenseTotals[catName] = (expenseTotals[catName] || 0) + amount;
            }
        })
    }

    // Format data for the Donut Chart
    const chartData = Object.entries(expenseTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Format money helper
    const fmt = (num: number) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="bg-slate-100 font-sans min-h-screen pb-12">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4 md:mt-0">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900">Household Ledger</h1>
                        <p className="text-slate-500 font-medium mt-1">Zero-based wealth tracking.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="flex-1 md:flex-none">
                            <TransactionForm categories={categories || []} />
                        </div>
                        <a href="/dashboard/settings" className="flex items-center justify-center bg-slate-100 text-slate-600 p-3 rounded-xl hover:bg-slate-200 transition border border-slate-200 shadow-sm">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </a>
                    </div>
                </header>

                {/* Top Level Metrics */}
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-emerald-500 text-center">
                        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Income</h3>
                        <p className="text-xl md:text-3xl font-black text-slate-800 mt-1">${fmt(totalIncome)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-rose-500 text-center">
                        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</h3>
                        <p className="text-xl md:text-3xl font-black text-slate-800 mt-1">${fmt(totalExpenses)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-indigo-500 text-center bg-indigo-50">
                        <h3 className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-wider">Left to Allocate</h3>
                        <p className="text-xl md:text-3xl font-black text-indigo-700 mt-1">${fmt(totalIncome - totalExpenses)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Visual Spending Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Spending Breakdown</h2>
                        <SpendingChart data={chartData} />
                    </div>

                    {/* Target Savings Buckets */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800">Savings Targets</h2>
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Custom Buckets</span>
                        </div>

                        <div className="space-y-5">
                            {buckets?.map((bucket: any) => {
                                const percent = bucket.target_amount > 0 ? Math.min((bucket.current_amount / bucket.target_amount) * 100, 100) : 0;
                                return (
                                    <div key={bucket.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-bold text-slate-700">{bucket.name}</span>
                                            <span className="font-bold text-slate-900">${fmt(bucket.current_amount)} <span className="text-slate-400 font-medium">/ ${fmt(bucket.target_amount)}</span></span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3">
                                            <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Zero-Based Category Limits */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Monthly Category Limits</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {categories?.filter((c: any) => c.type === 'expense').map((category: any) => {
                            const limit = Number(category.monthly_limit || 0);
                            const spent = expenseTotals[category.name] || 0;
                            const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

                            // Turn the bar red if they are over 90% of the budget
                            const barColor = percent > 90 ? 'bg-rose-500' : 'bg-emerald-500';

                            return (
                                <div key={category.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-slate-700">{category.name}</span>
                                        <span className="font-bold text-slate-900">${fmt(spent)} <span className="text-slate-400 font-medium">/ ${fmt(limit)}</span></span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    )
}