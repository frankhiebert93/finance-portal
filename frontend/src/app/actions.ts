'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { parseAmount, parseString, parseId } from '@/lib/validate'

export async function addTransaction(formData: FormData) {
    const supabase = await createClient()

    const amount = parseAmount(formData.get('amount'), { field: 'amount' })
    const category_id = formData.get('category_id')
    const date = parseString(formData.get('date'), { maxLength: 32, required: true, field: 'date' })
    const note = parseString(formData.get('note'), { maxLength: 200, field: 'note' })

    const { error } = await supabase.from('transactions').insert({
        amount,
        category_id: category_id ? parseId(category_id, 'category') : null,
        date,
        note,
        workspace: 'personal',
    })

    if (error) {
        throw new Error(error.message)
    }

    // This tells Next.js to instantly refresh the dashboard page
    // so your new transaction shows up immediately without refreshing the browser.
    revalidatePath('/dashboard/personal')
}
