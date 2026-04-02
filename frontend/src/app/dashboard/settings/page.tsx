import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: categories } = await supabase.from('categories').select('*').eq('type', 'expense').order('name')
    const { data: buckets } = await supabase.from('savings_buckets').select('*').order('created_at')
    const { data: debts } = await supabase.from('debts').select('*').order('created_at')

    async function updateLimit(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const id = formData.get('id') as string
        const limit = formData.get('limit') as string
        await supabase.from('categories').update({ monthly_limit: Number(limit) }).eq('id', id)
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/personal')
    }

    async function updateBucket(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const id = formData.get('id') as string
        const name = formData.get('name') as string
        const target = formData.get('target') as string
        const current = formData.get('current') as string
        await supabase.from('savings_buckets').update({ name, target_amount: Number(target), current_amount: Number(current) }).eq('id', id)
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/personal')
    }

    async function addCategory(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const name = formData.get('name') as string
        await supabase.from('categories').insert({ name, type: 'expense', workspace: 'personal', monthly_limit: 0 })
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/personal')
    }

    // NEW: Action to add a debt profile
    async function addDebt(formData: FormData) {
        'use server'
        const supabase = await createClient()
        await supabase.from('debts').insert({
            name: formData.get('name') as string,
            current_balance: Number(formData.get('balance')),
            interest_rate: Number(formData.get('rate')),
            min_payment: Number(formData.get('payment')),
            workspace: 'personal'
        })
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/personal')
    }

    // NEW: Action to update a debt profile
    async function updateDebt(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const id = formData.get('id') as string
        await supabase.from('debts').update({
            current_balance: Number(formData.get('balance')),
            interest_rate: Number(formData.get('rate')),
            min_payment: Number(formData.get('payment'))
        }).eq('id', id)
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/personal')
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-safe">
            <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">

                <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">App Settings</h1>
                    </div>
                    <Link href="/dashboard/personal" className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition">
                        Done
                    </Link>
                </header>

                {/* Debt Profiles Editor */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 border-l-4 border-l-rose-500">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Debt Attack Plan</h2>

                    <div className="space-y-6 mb-8">
                        {debts?.map(debt => (
                            <form key={debt.id} action={updateDebt} className="flex flex-col gap-3 border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                                <input type="hidden" name="id" value={debt.id} />
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-700">{debt.name}</span>
                                    <button type="submit" className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200 transition text-sm">Save</button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Left to Pay ($)</label>
                                        <input type="number" step="0.01" name="balance" defaultValue={debt.current_balance} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">APR (%)</label>
                                        <input type="number" step="0.01" name="rate" defaultValue={debt.interest_rate} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Monthly Pay ($)</label>
                                        <input type="number" step="0.01" name="payment" defaultValue={debt.min_payment} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                                    </div>
                                </div>
                            </form>
                        ))}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">Add New Debt</h3>
                        <form action={addDebt} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input type="text" name="name" placeholder="Debt Name" required className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                            <input type="number" step="0.01" name="balance" placeholder="Balance ($)" required className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                            <input type="number" step="0.01" name="rate" placeholder="APR (%)" required className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                            <input type="number" step="0.01" name="payment" placeholder="Monthly Pay ($)" required className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-rose-500 outline-none" />
                            <button type="submit" className="md:col-span-4 bg-rose-100 text-rose-700 px-4 py-2 rounded-lg font-bold hover:bg-rose-200 transition">Add Debt</button>
                        </form>
                    </div>
                </div>

                {/* Existing Savings Buckets & Categories UI below */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Monthly Category Limits</h2>
                    <div className="space-y-4">
                        {categories?.map(cat => (
                            <form key={cat.id} action={updateLimit} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <input type="hidden" name="id" value={cat.id} />
                                <span className="font-bold text-slate-700">{cat.name}</span>
                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    <span className="text-slate-400 font-bold">$</span>
                                    <input type="number" name="limit" defaultValue={cat.monthly_limit || 0} className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold text-right focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    <button type="submit" className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-200 transition">Save</button>
                                </div>
                            </form>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Add New Category</h2>
                    <form action={addCategory} className="flex flex-col md:flex-row gap-3">
                        <input type="text" name="name" placeholder="e.g. Groceries" required className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <button type="submit" className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-200 transition">Add Category</button>
                    </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Custom Savings Targets</h2>
                    <div className="space-y-6">
                        {buckets?.map(bucket => (
                            <form key={bucket.id} action={updateBucket} className="flex flex-col gap-3 border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                                <input type="hidden" name="id" value={bucket.id} />
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bucket Name</label>
                                        <input type="text" name="name" defaultValue={bucket.name} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="w-full md:w-1/4">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Saved</label>
                                        <input type="number" name="current" defaultValue={bucket.current_amount || 0} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="w-full md:w-1/4">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target</label>
                                        <input type="number" name="target" defaultValue={bucket.target_amount || 0} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <button type="submit" className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-200 transition self-end">Update Target</button>
                            </form>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}