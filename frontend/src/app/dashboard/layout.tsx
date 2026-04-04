import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {children}

            {/* Mobile App Navigation Bar */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
                <div className="max-w-md mx-auto flex justify-around p-3">
                    <Link href="/dashboard/personal" className="flex flex-col items-center text-slate-400 hover:text-indigo-600 transition">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        <span className="text-[10px] font-bold">Dashboard</span>
                    </Link>
                    <Link href="/dashboard/transactions" className="flex flex-col items-center text-slate-400 hover:text-indigo-600 transition">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span className="text-[10px] font-bold">History</span>
                    </Link>
                    <Link href="/dashboard/settings" className="flex flex-col items-center text-slate-400 hover:text-indigo-600 transition">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span className="text-[10px] font-bold">Settings</span>
                    </Link>
                </div>
            </nav>
        </div>
    )
}