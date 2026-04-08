'use client'

import { useRouter } from 'next/navigation'

export default function MonthPicker({ currentMonth }: { currentMonth: string }) {
    const router = useRouter()
    const now = new Date()

    return (
        <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none"
            onChange={(e) => router.push(`/dashboard/personal?month=${e.target.value}`)}
            defaultValue={currentMonth}
        >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const val = d.toISOString().substring(0, 7)
                return <option key={val} value={val}>{d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>
            })}
        </select>
    )
}