import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: { message: string } }) {

    async function signIn(formData: FormData) {
        'use server'
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const supabase = await createClient()

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return redirect('/?message=Could not authenticate user')
        }
        return redirect('/dashboard/personal')
    }

    return (
        <div className="min-h-screen bg-[#fff7e5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#eadebe] to-transparent opacity-50 pointer-events-none"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center mb-2">
                    {/* Simple abstract logo icon */}
                    <svg className="w-12 h-12 text-[#c79e52]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#1c1b1c" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h2 className="mt-2 text-center text-4xl font-extrabold text-[#1c1b1c] tracking-tight">
                    Finance Portal
                </h2>
                <p className="mt-2 text-center text-sm text-[#1c1b1c]/70 font-medium">
                    Secure access to your household & business ledgers
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-2xl sm:px-10 border border-[#d3b378]/20">
                    <form className="space-y-6" action={signIn}>
                        <div>
                            <label className="block text-sm font-bold text-[#1c1b1c]">Email address</label>
                            <div className="mt-1">
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c79e52] focus:border-transparent transition"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#1c1b1c]">Password</label>
                            <div className="mt-1">
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c79e52] focus:border-transparent transition"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {searchParams?.message && (
                            <p className="mt-4 p-4 bg-red-50 text-red-700 font-medium text-center text-sm rounded-xl border border-red-100">
                                {searchParams.message}
                            </p>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-md font-bold text-[#1c1b1c] bg-[#c79e52] hover:bg-[#b58c42] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1c1b1c] transition-all transform hover:-translate-y-0.5"
                            >
                                Sign Into Portal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}