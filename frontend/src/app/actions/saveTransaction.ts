'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function saveTransactionAction(amount: number, note: string, categoryId: string) {
    const supabase = await createClient()

    await supabase.from('transactions').insert({
        amount,
        note,
        category_id: categoryId,
        date: new Date().toISOString().split('T')[0],
        workspace: 'personal'
    })

    revalidatePath('/dashboard/personal')
    revalidatePath('/dashboard/transactions')
    return { success: true }
}