import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-slate-50 min-h-screen pb-24">
            {/* The actual page content loads here */}
            {children}

            {/* iOS/Android Style Bottom Navigation Bar */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center h-20 px-6 z-50 shadow-[0_-4px_25px_rgba(0,0,0,0.05)] pb-safe">

                <Link href="/dashboard/personal" className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-indigo-600 focus:text-indigo-600 transition w-full text-center">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest">Household</span>
                </Link>

                {/* Center Divider */}
                <div className="h-8 w-px bg-slate-200 rounded-full"></div>

                <Link href="/dashboard/business" className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-amber-500 focus:text-amber-500 transition w-full text-center">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest">Business</span>
                </Link>

            </nav>
        </div>
    )
}