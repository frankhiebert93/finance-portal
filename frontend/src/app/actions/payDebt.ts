'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { parseAmount, parseId, ValidationError } from '@/lib/validate'

export async function payDebtAction(debtId: string, currentBalance: number, amount: number) {
    try {
        const id = parseId(debtId, 'debt')
        const payment = parseAmount(amount, { min: 0, field: 'payment' })

        const supabase = await createClient()

        // Read the authoritative balance from the DB rather than trusting the
        // client-supplied currentBalance, then deduct (never below zero).
        const { data: debt, error: readError } = await supabase
            .from('debts')
            .select('current_balance')
            .eq('id', id)
            .eq('workspace', 'personal')
            .single()
        if (readError || !debt) throw new Error('Debt not found.')

        const newBalance = Math.max(0, Number(debt.current_balance || 0) - payment)

        const { error } = await supabase
            .from('debts')
            .update({ current_balance: newBalance })
            .eq('id', id)
            .eq('workspace', 'personal')
        if (error) throw new Error(error.message)

        revalidatePath('/dashboard/personal')
        revalidatePath('/dashboard/settings')
        return { success: true }
    } catch (err) {
        const message = err instanceof ValidationError ? err.message : 'Could not apply payment.'
        return { success: false, error: message }
    }
}
