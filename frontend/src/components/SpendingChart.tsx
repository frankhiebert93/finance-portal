'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export default function SpendingChart({ data }: { data: any[] }) {
    const COLORS = ['#10b981', '#f43f5e', '#6366f1', '#f59e0b', '#8b5cf6', '#06b6d4', '#14b8a6'];

    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-64 text-slate-400 font-medium">No expenses logged yet.</div>
    }

    return (
        // Increased the overall height and added bottom padding to contain the wrapping text
        <div className="h-80 md:h-96 w-full pb-4">
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
                        formatter={(value: any) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                    />
                    {/* Removed the height restriction and added padding to push it down cleanly */}
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}