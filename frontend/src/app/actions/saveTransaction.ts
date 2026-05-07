'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function saveTransactionAction(
    amount: number, 
    note: string, 
    categoryId: string | null,
    mode: 'transaction' | 'transfer',
    wallet: 'bank' | 'cash',
    transferDirection: 'bank_to_cash' | 'cash_to_bank'
) {
    const supabase = await createClient()
    const date = new Date().toISOString().split('T')[0]

    if (mode === 'transfer') {
        // MAGIC TRICK: Insert two opposing rows to perfectly move the balance
        const isBankToCash = transferDirection === 'bank_to_cash'
        const sourceWallet = isBankToCash ? 'bank' : 'cash'
        const destWallet = isBankToCash ? 'cash' : 'bank'

        await supabase.from('transactions').insert([
            {
                amount: -Math.abs(amount), // The deduction
                note: note || `Transfer to ${destWallet.toUpperCase()}`,
                category_id: null,
                date,
                workspace: 'personal',
                wallet: sourceWallet
            },
            {
                amount: Math.abs(amount), // The addition
                note: note || `Transfer from ${sourceWallet.toUpperCase()}`,
                category_id: null,
                date,
                workspace: 'personal',
                wallet: destWallet
            }
        ])
    } else {
        // Normal single transaction insert
        await supabase.from('transactions').insert({
            amount,
            note,
            category_id: categoryId,
            date,
            workspace: 'personal',
            wallet: wallet
        })
    }

    revalidatePath('/dashboard/personal')
    revalidatePath('/dashboard/transactions')
    return { success: true }
}
