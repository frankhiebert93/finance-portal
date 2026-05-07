'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function payDebtAction(debtId: string, currentBalance: number, amount: number) {
    const supabase = await createClient()

    // Deduct the payment, preventing the balance from dropping below zero
    const newBalance = Math.max(0, currentBalance - amount)

    await supabase.from('debts').update({
        current_balance: newBalance
    }).eq('id', debtId)

    // Instantly refresh the dashboard and settings
    revalidatePath('/dashboard/personal')
    revalidatePath('/dashboard/settings')
    return { success: true }
}
