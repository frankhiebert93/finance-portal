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
    const { data: debts } = await supabase.from('debts').select('*').eq('workspace', 'personal').order('created_at')

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
        <div className="bg-slate-100 font-sans min-h-screen pb-16">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">

                {/* Header Area */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 mt-2 md:mt-0">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 truncate">Household Ledger</h1>
                        <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Zero-based wealth tracking.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="flex-1 md:flex-none">
                            <TransactionForm categories={categories || []} />
                        </div>
                        <a href="/dashboard/settings" className="flex items-center justify-center bg-slate-100 text-slate-600 p-3 rounded-xl hover:bg-slate-200 transition border border-slate-200 shadow-sm shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </a>
                    </div>
                </header>

                {/* Top Level Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-b-4 border-emerald-500 flex flex-col items-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Income</h3>
                        <p className="text-3xl md:text-3xl font-black text-slate-800 mt-1 break-words">${fmt(totalIncome)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-b-4 border-rose-500 flex flex-col items-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</h3>
                        <p className="text-3xl md:text-3xl font-black text-slate-800 mt-1 break-words">${fmt(totalExpenses)}</p>
                    </div>
                    <div className="bg-indigo-50 p-5 rounded-2xl shadow-sm border-b-4 border-indigo-500 flex flex-col items-center">
                        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Left to Allocate</h3>
                        <p className="text-3xl md:text-3xl font-black text-indigo-700 mt-1 break-words">${fmt(totalIncome - totalExpenses)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">

                    {/* Visual Spending Chart */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-5">Spending Breakdown</h2>
                        <div className="p-2">
                            <SpendingChart data={chartData} />
                        </div>
                    </div>

                    {/* Target Savings Buckets */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 md:mb-8">
                            <h2 className="text-lg font-bold text-slate-800">Savings Targets</h2>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">Custom Buckets</span>
                        </div>

                        <div className="space-y-6 md:space-y-7">
                            {buckets?.map((bucket: any) => {
                                const percent = bucket.target_amount > 0 ? Math.min((bucket.current_amount / bucket.target_amount) * 100, 100) : 0;
                                return (
                                    <div key={bucket.id}>
                                        <div className="flex justify-between items-baseline mb-1.5 gap-2">
                                            <span className="font-bold text-slate-700 text-sm md:text-base truncate">{bucket.name}</span>
                                            <span className="font-bold text-slate-900 text-xs md:text-sm shrink-0">${fmt(bucket.current_amount)} <span className="text-slate-400 font-medium">/ ${fmt(bucket.target_amount)}</span></span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3.5 border border-slate-200">
                                            <div className="bg-amber-500 h-full rounded-full transition-all duration-500 relative" style={{ width: `${percent}%` }}>
                                                <div className="absolute inset-0 bg-white opacity-20 rounded-full h-1 mt-0.5 mx-1"></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Active Debt Tracker */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 md:mb-8">
                        <h2 className="text-lg font-bold text-slate-800">Active Debt Tracker</h2>
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">Amortization Engine</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {debts?.map((debt: any) => {
                            const balance = Number(debt.current_balance || 0);
                            const apr = Number(debt.interest_rate || 0);
                            const payment = Number(debt.min_payment || 0);

                            // Monthly Math
                            const monthlyRate = (apr / 100) / 12;
                            const thisMonthInterest = balance * monthlyRate;

                            // Payoff Date Math
                            let payoffMessage = "";
                            let statusColor = "text-rose-600 bg-rose-50 border-rose-200";

                            if (balance <= 0) {
                                payoffMessage = "Paid in full! 🎉";
                                statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                            } else if (payment <= thisMonthInterest) {
                                payoffMessage = "Payment doesn't cover interest! Will never pay off.";
                            } else {
                                const monthsToPayoff = -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate);
                                const totalMonths = Math.ceil(monthsToPayoff);
                                const d = new Date();
                                d.setMonth(d.getMonth() + totalMonths);
                                payoffMessage = `Est. Payoff: ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                            }

                            return (
                                <div key={debt.id} className={`p-4 rounded-xl border ${statusColor} space-y-3`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-extrabold text-lg text-slate-900">{debt.name}</h3>
                                        <span className="font-black text-xl text-slate-900">${fmt(balance)}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-500">APR</span>
                                            <span className="font-bold text-slate-800">{apr}%</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-500">Monthly Payment</span>
                                            <span className="font-bold text-slate-800">${fmt(payment)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-rose-500">Interest This Month</span>
                                            <span className="font-bold text-rose-700">${fmt(thisMonthInterest)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-500">Principal Paid</span>
                                            <span className="font-bold text-emerald-600">${fmt(Math.max(payment - thisMonthInterest, 0))}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <span className="block text-sm font-bold opacity-90">{payoffMessage}</span>
                                    </div>
                                </div>
                            )
                        })}
                        {(!debts || debts.length === 0) && (
                            <div className="col-span-1 md:col-span-2 text-center py-6 text-slate-400 font-medium">No debts tracked. You're completely debt free!</div>
                        )}
                    </div>
                </div>

                {/* Zero-Based Category Limits */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 md:p-8">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 md:mb-8">Monthly Category Limits</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7 md:gap-y-8">
                        {categories?.filter((c: any) => c.type === 'expense').map((category: any) => {
                            const limit = Number(category.monthly_limit || 0);
                            const spent = expenseTotals[category.name] || 0;
                            const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

                            const barColor = percent > 95 ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500';

                            return (
                                <div key={category.id}>
                                    <div className="flex justify-between items-baseline mb-1.5 gap-2">
                                        <span className="font-bold text-slate-700 text-sm md:text-base truncate">{category.name}</span>
                                        <span className="font-bold text-slate-900 text-xs md:text-sm shrink-0">${fmt(spent)} <span className="text-slate-400 font-medium">/ ${fmt(limit)}</span></span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200">
                                        <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
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