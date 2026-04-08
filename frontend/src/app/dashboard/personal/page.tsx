import { createClient } from '@/lib/supabase'
import TransactionForm from '@/components/TransactionForm'
import SpendingChart from '@/components/SpendingChart'
import MonthPicker from '@/components/MonthPicker'

export const dynamic = 'force-dynamic'

export default async function PersonalDashboard({ searchParams }: { searchParams: any }) {
    const supabase = await createClient()
    const params = await searchParams
    const now = new Date()

    // 1. Resolve selected month
    const selectedMonth = params.month ? new Date(params.month + "-02") : now
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()

    const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

    // 2. Fetch Data
    const { data: categories } = await supabase.from('categories').select('*').eq('workspace', 'personal').order('name')

    // This Month's Transactions
    const { data: transactions } = await supabase.from('transactions')
        .select(`amount, date, categories (name, type)`)
        .eq('workspace', 'personal')
        .gte('date', firstDay).lte('date', lastDay)

    // All history prior to this month (for carry-over)
    const { data: allPriorHistory } = await supabase.from('transactions')
        .select(`amount, categories (type)`)
        .eq('workspace', 'personal')
        .lt('date', firstDay)

    const { data: buckets } = await supabase.from('savings_buckets').select('*').eq('workspace', 'personal').order('created_at')
    const { data: debts } = await supabase.from('debts').select('*').eq('workspace', 'personal').order('created_at')

    // 3. Calculate Carry Over Surplus
    let carryOverSurplus = 0
    allPriorHistory?.forEach((tx: any) => {
        // Supabase joins can sometimes return the joined data as an array [ {type: 'income'} ]
        // or a single object {type: 'income'}. This handles both:
        const categoryData = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
        const type = categoryData?.type;
        const amount = Number(tx.amount || 0);

        if (type === 'income') {
            carryOverSurplus += amount;
        } else {
            carryOverSurplus -= amount;
        }
    })

    // 4. Calculate This Month's Math
    let thisMonthIncome = 0
    let thisMonthExpenses = 0
    const expenseTotals: Record<string, number> = {}

    transactions?.forEach((tx: any) => {
        const amt = Number(tx.amount)
        const catName = tx.categories?.name || 'Uncategorized'
        if (tx.categories?.type === 'income') {
            thisMonthIncome += amt
        } else {
            thisMonthExpenses += amt
            expenseTotals[catName] = (expenseTotals[catName] || 0) + amt
        }
    })

    const remainingToAllocate = (carryOverSurplus + thisMonthIncome) - thisMonthExpenses

    // 5. Debt Freedom Logic
    let totalDebt = 0; let maxMonthsToPayoff = 0; let willNeverPayOff = false;
    debts?.forEach((debt: any) => {
        const balance = Number(debt.current_balance || 0);
        const apr = Number(debt.interest_rate || 0);
        const payment = Number(debt.min_payment || 0);
        totalDebt += balance;
        if (balance > 0) {
            const monthlyRate = (apr / 100) / 12;
            if (payment <= (balance * monthlyRate)) willNeverPayOff = true;
            else {
                const months = -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate);
                if (months > maxMonthsToPayoff) maxMonthsToPayoff = months;
            }
        }
    });

    const freedomDate = totalDebt > 0
        ? new Date(now.getFullYear(), now.getMonth() + Math.ceil(maxMonthsToPayoff)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Debt Free! 🎉';

    // Format Helpers
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const chartData = Object.entries(expenseTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return (
        <div className="bg-slate-100 font-sans min-h-screen pb-20">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h1>
                        <p className="text-slate-500 font-bold text-xs tracking-widest mt-1 uppercase">Wealth Ledger</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <MonthPicker currentMonth={firstDay.substring(0, 7)} />
                        <TransactionForm categories={categories || []} />
                    </div>
                </header>

                {/* Top Level Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-b-4 border-slate-300">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carried Forward</h3>
                        <p className={`text-2xl font-black ${carryOverSurplus >= 0 ? 'text-slate-700' : 'text-rose-500'}`}>${fmt(carryOverSurplus)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-b-4 border-emerald-500">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month Income</h3>
                        <p className="text-2xl font-black text-slate-800">${fmt(thisMonthIncome)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-b-4 border-rose-500">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month Expenses</h3>
                        <p className="text-2xl font-black text-slate-800">${fmt(thisMonthExpenses)}</p>
                    </div>
                    <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg text-white">
                        <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Remaining To Allocate</h3>
                        <p className="text-2xl font-black">${fmt(remainingToAllocate)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {/* Spending Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-5">Spending Breakdown</h2>
                        <SpendingChart data={chartData} />
                    </div>

                    {/* Savings Buckets */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
                                        <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
                                            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${percent}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Master Debt Box */}
                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Household Debt</h3>
                        <p className="text-4xl font-black text-rose-400">${fmt(totalDebt)}</p>
                    </div>
                    <div className="bg-slate-800 px-5 py-3 rounded-lg border border-slate-700 text-center md:text-right">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Freedom Date</h3>
                        <p className={`text-xl font-bold ${willNeverPayOff ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {willNeverPayOff ? 'Payments too low' : freedomDate}
                        </p>
                    </div>
                </div>

                {/* Budget Bars */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <h2 className="text-lg font-bold text-slate-800 mb-8">Monthly Category Status</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {categories?.filter((c: any) => c.type === 'expense').map((cat: any) => {
                            const spent = expenseTotals[cat.name] || 0;
                            const limit = Number(cat.monthly_limit || 0);
                            const percent = limit > 0 ? (spent / limit) * 100 : 0;
                            const color = percent > 100 ? 'bg-rose-500' : 'bg-emerald-500';
                            return (
                                <div key={cat.id}>
                                    <div className="flex justify-between items-baseline mb-1.5 gap-2">
                                        <span className="font-bold text-slate-700 text-sm truncate">{cat.name}</span>
                                        <span className="font-bold text-slate-900 text-xs">${fmt(spent)} / ${fmt(limit)}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div className={`${color} h-full transition-all duration-500`} style={{ width: `${Math.min(percent, 100)}%` }} />
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