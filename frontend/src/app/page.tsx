'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { unlockApp } from '@/app/actions/auth'

export default function LockScreen() {
    const [pin, setPin] = useState('')
    const [error, setError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(false)

        const result = await unlockApp(pin)

        if (result.success) {
            router.push('/dashboard/personal')
        } else {
            setError(true)
            setPin('')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="max-w-xs w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">

                <div className="text-center space-y-2">
                    <div className="bg-slate-800 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-slate-700 shadow-xl mb-6">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Vault Locked</h1>
                    <p className="text-slate-400 font-medium text-sm">Enter PIN or use Face ID to continue.</p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-6">
                    <div>
                        {/* The autocomplete="current-password" is what triggers Face ID! */}
                        <input
                            type="password"
                            inputMode="numeric"
                            name="pin"
                            id="pin"
                            autoComplete="current-password"
                            required
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className={`w-full bg-slate-800 border ${error ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-white'} rounded-xl px-4 py-4 text-center text-3xl font-black tracking-[0.5em] focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-inner`}
                            placeholder="••••"
                        />
                        {error && <p className="text-rose-400 text-xs font-bold text-center mt-3 uppercase tracking-wider">Incorrect PIN</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || pin.length < 4}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-500 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Decrypting...' : 'Unlock Vault'}
                    </button>
                </form>
            </div>
        </div>
    )
}