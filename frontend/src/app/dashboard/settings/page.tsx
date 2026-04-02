import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: categories } = await supabase.from('categories').select('*').eq('type', 'expense').order('name')
    const { data: buckets } = await supabase.from('savings_buckets').select('*').order('created_at')

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
        await supabase.from('savings_buckets').update({ name, target_amount: Number(target) }).eq('id', id)
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/personal')
    }

    // NEW: Server Action to add a category
    async function addCategory(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const name = formData.get('name') as string

        await supabase.from('categories').insert({
            name,
            type: 'expense',
            workspace: 'personal',
            monthly_limit: 0
        })

        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard/personal')
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-safe">
            <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">

                <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">App Settings</h1>
                        <p className="text-slate-500 font-medium mt-1">Manage budgets and buckets.</p>
                    </div>
                    <Link href="/dashboard/personal" className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition">
                        Done
                    </Link>
                </header>

                {/* Category Limits Editor */}
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

                {/* Add New Category Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Add New Category</h2>
                    <form action={addCategory} className="flex flex-col md:flex-row gap-3">
                        <input type="text" name="name" placeholder="e.g. Groceries" required className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <button type="submit" className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-200 transition">Add Category</button>
                    </form>
                </div>

                {/* Custom Savings Buckets Editor */}
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

                                    <div className="w-full md:w-1/3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Amount</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-bold">$</span>
                                            <input type="number" name="target" defaultValue={bucket.target_amount || 0} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
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