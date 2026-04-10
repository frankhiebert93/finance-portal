import { createClient } from '@/lib/supabase'
import TransactionForm from '@/components/TransactionForm'
import SpendingChart from '@/components/SpendingChart'
import TrendChart from '@/components/TrendChart'
import MonthPicker from '@/components/MonthPicker'

export const dynamic = 'force-dynamic'

export default async function PersonalDashboard({ searchParams }: { searchParams: any }) {
    const supabase = await createClient()
    const params = await searchParams
    const now = new Date()

    const selectedMonth = params.month ? new Date(params.month + "-02") : now
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()

    const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const sixMonthsAgoDate = new Date(year, month - 5, 1)
    const sixMonthsAgo = sixMonthsAgoDate.toISOString().split('T')[0]

    // Fetch Data
    const { data: categories } = await supabase.from('categories').select('*').eq('workspace', 'personal').order('name')

    const { data: transactions } = await supabase.from('transactions')
        .select(`amount, date, categories (name, type)`)
        .eq('workspace', 'personal')
        .gte('date', firstDay).lte('date', lastDay)

    const { data: allPriorHistory } = await supabase.from('transactions')
        .select(`amount, categories (type)`)
        .eq('workspace', 'personal')
        .lt('date', firstDay)

    const { data: trendTransactions } = await supabase.from('transactions')
        .select(`amount, date, categories (type)`)
        .eq('workspace', 'personal')
        .gte('date', sixMonthsAgo)
        .lte('date', lastDay)

    const { data: buckets } = await supabase.from('savings_buckets').select('*').eq('workspace', 'personal').order('created_at')
    const { data: debts } = await supabase.from('debts').select('*').eq('workspace', 'personal').order('created_at')

    // Calculate Carry Over
    let carryOverSurplus = 0
    allPriorHistory?.forEach((tx: any) => {
        const catData = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
        const amount = Number(tx.amount || 0);
        if (catData?.type === 'income') carryOverSurplus += amount;
        else carryOverSurplus -= amount;
    })

    // Calculate This Month
    let thisMonthIncome = 0
    let thisMonthExpenses = 0
    const expenseTotals: Record<string, number> = {}

    transactions?.forEach((tx: any) => {
        const catData = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
        const amt = Number(tx.amount || 0)
        const catName = catData?.name || 'Uncategorized'

        if (catData?.type === 'income') thisMonthIncome += amt
        else {
            thisMonthExpenses += amt
            expenseTotals[catName] = (expenseTotals[catName] || 0) + amt
        }
    })

    const remainingToAllocate = (carryOverSurplus + thisMonthIncome) - thisMonthExpenses

    // Generate 6-Month Trend Data
    const trendMap: Record<string, { month: string, income: number, expenses: number, sortKey: string }> = {};
    for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - i, 1);
        const key = d.toISOString().substring(0, 7);
        trendMap[key] = {
            month: d.toLocaleDateString('en-US', { month: 'short' }),
            income: 0,
            expenses: 0,
            sortKey: key
        };
    }

    trendTransactions?.forEach((tx: any) => {
        const txDate = tx.date.substring(0, 7);
        if (trendMap[txDate]) {
            const catData = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
            const amt = Number(tx.amount || 0);
            if (catData?.type === 'income') trendMap[txDate].income += amt;
            else trendMap[txDate].expenses += amt;
        }
    });
    const trendData = Object.values(trendMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Debt Math
    let totalDebtAmount = 0; let maxMonthsToPayoff = 0; let globalWillNeverPayOff = false;

    // Format Helpers & Palettes
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const chartData = Object.entries(expenseTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // A curated palette of modern, inviting colors for the categories
    const colorPalette = [
        'bg-indigo-400', 'bg-teal-400', 'bg-amber-400', 'bg-fuchsia-400',
        'bg-sky-400', 'bg-pink-400', 'bg-emerald-400', 'bg-violet-400'
    ];

    return (
        < div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans min-h-screen pb-20" >
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h1>
                        <p className="text-indigo-400 font-bold text-xs tracking-widest mt-1 uppercase">Wealth Ledger</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <MonthPicker currentMonth={firstDay.substring(0, 7)} />
                        <TransactionForm categories={categories || []} />
                    </div>
                </header>

                {/* Top Level Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-white to-slate-100 p-5 rounded-2xl shadow-sm border-b-4 border-slate-300">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Carried Forward</h3>
                        <p className={`text-2xl font-black ${carryOverSurplus >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>${fmt(carryOverSurplus)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-2xl shadow-sm border-b-4 border-emerald-500">
                        <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Month Income</h3>
                        <p className="text-2xl font-black text-emerald-950">${fmt(thisMonthIncome)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-5 rounded-2xl shadow-sm border-b-4 border-rose-500">
                        <h3 className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Month Expenses</h3>
                        <p className="text-2xl font-black text-rose-950">${fmt(thisMonthExpenses)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-5 rounded-2xl shadow-lg text-white">
                        <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Remaining To Allocate</h3>
                        <p className="text-2xl font-black">${fmt(remainingToAllocate)}</p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">6-Month Trend</h2>
                        <TrendChart data={trendData} />
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-5">Current Breakdown</h2>
                        <SpendingChart data={chartData} />
                    </div>
                </div>

                {/* Categories and Savings Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-6">Category Limits</h2>
                        <div className="space-y-6">
                            {categories?.filter((c: any) => c.type === 'expense').map((cat: any, index: number) => {
                                const spent = expenseTotals[cat.name] || 0;
                                const limit = Number(cat.monthly_limit || 0);
                                const perc = limit > 0 ? (spent / limit) * 100 : 0;

                                // Pick a color from the palette, but turn red if over budget
                                const baseColor = colorPalette[index % colorPalette.length];
                                const color = perc > 100 ? 'bg-rose-500' : baseColor;

                                return (
                                    <div key={cat.id}>
                                        <div className="flex justify-between items-baseline mb-1.5">
                                            <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                                            <span className="font-bold text-slate-900 text-xs">${fmt(spent)} / ${fmt(limit)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div className={`${color} h-full transition-all duration-500`} style={{ width: `${Math.min(perc, 100)}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-6">Savings Targets</h2>
                        <div className="space-y-6">
                            {buckets?.map((bucket: any) => {
                                const percent = bucket.target_amount > 0 ? Math.min((bucket.current_amount / bucket.target_amount) * 100, 100) : 0;
                                return (
                                    <div key={bucket.id}>
                                        <div className="flex justify-between items-baseline mb-1.5 gap-2">
                                            <span className="font-bold text-slate-700 text-sm truncate">{bucket.name}</span>
                                            <span className="font-bold text-slate-900 text-xs">${fmt(bucket.current_amount)} / ${fmt(bucket.target_amount)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-100 overflow-hidden">
                                            <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${percent}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Individual Debt Tracker */}
                <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Active Debt Tracker</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {debts?.map((debt: any) => {
                            const balance = Number(debt.current_balance || 0);
                            const apr = Number(debt.interest_rate || 0);
                            const payment = Number(debt.min_payment || 0);
                            const monthlyRate = (apr / 100) / 12;
                            const monthlyInterest = balance * monthlyRate;

                            totalDebtAmount += balance;

                            let payoffMessage = "";
                            if (balance <= 0) payoffMessage = "Paid! 🎉";
                            else if (payment <= monthlyInterest) {
                                payoffMessage = "Negative Amortization";
                                globalWillNeverPayOff = true;
                            } else {
                                const m = -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate);
                                if (m > maxMonthsToPayoff) maxMonthsToPayoff = m;
                                const d = new Date(); d.setMonth(d.getMonth() + Math.ceil(m));
                                payoffMessage = `Est. Payoff: ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                            }

                            return (
                                <div key={debt.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-extrabold text-slate-900">{debt.name}</h3>
                                        <span className="font-black text-lg text-rose-500">${fmt(balance)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 uppercase">
                                        <div>APR: <span className="text-slate-900">{apr}%</span></div>
                                        <div>Payment: <span className="text-slate-900">${fmt(payment)}</span></div>
                                    </div>
                                    <div className="text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">
                                        {payoffMessage}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Master Debt Summary */}
                    <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
                        <div>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Owed</span>
                            <span className="text-3xl font-black text-rose-400">${fmt(totalDebtAmount)}</span>
                        </div>
                        <div className="text-center md:text-right">
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Household Freedom</span>
                            <span className="text-xl font-bold text-emerald-400">
                                {globalWillNeverPayOff ? 'Check Payments' : (totalDebtAmount > 0 ? new Date(now.getFullYear(), now.getMonth() + Math.ceil(maxMonthsToPayoff)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Debt Free!')}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div >
    )
}