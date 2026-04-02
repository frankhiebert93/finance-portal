import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function BusinessDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const ADMIN_EMAIL = 'countryfolk93@gmail.com'
    if (user.email !== ADMIN_EMAIL) {
        redirect('/dashboard/personal')
    }

    let businessData = null;
    let fetchError = null;

    // Uses Render URL if available, otherwise defaults to local PC
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    try {
        const res = await fetch(`${API_URL}/api/business/financials`, {
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error('Python API returned an error');
        }
        businessData = await res.json();
    } catch (error: any) {
        fetchError = error.message;
    }

    const metrics = businessData?.metrics || {
        invoiced_revenue: 0, cash_on_hand: 0, inventory_total_cost: 0, inventory_retail_value: 0
    };

    const inventoryList = businessData?.raw_data?.inventory || [];

    const formatMoney = (amount: number) => {
        return Number(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    };

    return (
        <div className="bg-slate-50 font-sans min-h-screen">
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4 md:mt-0">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900">Fine Edge Machines</h1>
                        <p className="text-slate-500 font-medium mt-1">Live ERP sync.</p>
                    </div>
                    {fetchError ? (
                        <span className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-sm">Sync Offline</span>
                    ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync Active
                        </span>
                    )}
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md border-l-4 border-emerald-500">
                        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue</h3>
                        <p className="text-xl md:text-3xl font-black text-slate-800 mt-1">${formatMoney(metrics.invoiced_revenue)}</p>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md border-l-4 border-amber-500">
                        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Cash</h3>
                        <p className="text-xl md:text-3xl font-black text-slate-800 mt-1">${formatMoney(metrics.cash_on_hand)}</p>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md border-l-4 border-rose-500">
                        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Inv Cost</h3>
                        <p className="text-xl md:text-3xl font-black text-slate-800 mt-1">${formatMoney(metrics.inventory_total_cost)}</p>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md border-l-4 border-indigo-500">
                        <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Retail Val</h3>
                        <p className="text-xl md:text-3xl font-black text-slate-800 mt-1">${formatMoney(metrics.inventory_retail_value)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-800">Recent Inventory Additions</h2>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {fetchError ? (
                            <div className="p-8 text-center text-red-500 font-medium text-sm">
                                Backend connection failed.
                            </div>
                        ) : inventoryList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-medium">
                                No inventory records found.
                            </div>
                        ) : (
                            inventoryList.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 text-sm">Item #{item.id?.toString().substring(0, 8) || 'Unknown'}</span>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {item.created_at ? `Added ${new Date(item.created_at).toLocaleDateString()}` : 'Date unrecorded'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-md text-slate-800">Cost: ${formatMoney(item.purchase_price)}</span>
                                        <span className="block text-xs font-bold text-amber-600">Retail: ${formatMoney(item.sale_price)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}