'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function addTransaction(formData: FormData) {
    const supabase = await createClient()

    const amount = formData.get('amount')
    const category_id = formData.get('category_id')
    const date = formData.get('date')
    const note = formData.get('note')

    const { error } = await supabase.from('transactions').insert({
        amount: Number(amount),
        category_id: category_id as string,
        date: date as string,
        note: note as string,
        workspace: 'personal'
    })

    if (error) {
        throw new Error(error.message)
    }

    // This tells Next.js to instantly refresh the dashboard page 
    // so your new transaction shows up immediately without refreshing the browser.
    revalidatePath('/dashboard/personal')
}