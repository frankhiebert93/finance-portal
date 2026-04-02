'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export default function SpendingChart({ data }: { data: any[] }) {
    const COLORS = ['#10b981', '#f43f5e', '#6366f1', '#f59e0b', '#8b5cf6', '#06b6d4', '#14b8a6'];

    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-64 text-slate-400 font-medium">No expenses logged yet.</div>
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}