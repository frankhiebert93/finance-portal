'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { parseAmount, parseString, parseEnum, parseId, ValidationError } from '@/lib/validate'

export async function saveTransactionAction(
    amount: number,
    note: string,
    categoryId: string | null,
    mode: 'transaction' | 'transfer',
    wallet: 'bank' | 'cash',
    transferDirection: 'bank_to_cash' | 'cash_to_bank'
) {
    try {
        const validMode = parseEnum(mode, ['transaction', 'transfer'] as const, 'mode')
        const validAmount = parseAmount(amount, { field: 'amount' })
        const validNote = parseString(note, { maxLength: 200, field: 'note' })

        const supabase = await createClient()
        const date = new Date().toISOString().split('T')[0]

        if (validMode === 'transfer') {
            const direction = parseEnum(
                transferDirection,
                ['bank_to_cash', 'cash_to_bank'] as const,
                'transfer direction'
            )
            // MAGIC TRICK: Insert two opposing rows to perfectly move the balance
            const isBankToCash = direction === 'bank_to_cash'
            const sourceWallet = isBankToCash ? 'bank' : 'cash'
            const destWallet = isBankToCash ? 'cash' : 'bank'

            const { error } = await supabase.from('transactions').insert([
                {
                    amount: -Math.abs(validAmount), // The deduction
                    note: validNote || `Transfer to ${destWallet.toUpperCase()}`,
                    category_id: null,
                    date,
                    workspace: 'personal',
                    wallet: sourceWallet,
                },
                {
                    amount: Math.abs(validAmount), // The addition
                    note: validNote || `Transfer from ${sourceWallet.toUpperCase()}`,
                    category_id: null,
                    date,
                    workspace: 'personal',
                    wallet: destWallet,
                },
            ])
            if (error) throw new Error(error.message)
        } else {
            const validWallet = parseEnum(wallet, ['bank', 'cash'] as const, 'wallet')
            const validCategory = categoryId ? parseId(categoryId, 'category') : null

            const { error } = await supabase.from('transactions').insert({
                amount: validAmount,
                note: validNote,
                category_id: validCategory,
                date,
                workspace: 'personal',
                wallet: validWallet,
            })
            if (error) throw new Error(error.message)
        }

        revalidatePath('/dashboard/personal')
        revalidatePath('/dashboard/transactions')
        return { success: true }
    } catch (err) {
        const message = err instanceof ValidationError ? err.message : 'Could not save transaction.'
        return { success: false, error: message }
    }
}
