'use server'

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function scanReceiptAction(base64Image: string, categories: { id: string, name: string }[]) {
    try {
        const categoryNames = categories.map(c => c.name).join(', ')

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a receipt data extractor. Extract the total amount and the merchant name from the image. 
          Match the purchase to one of these specific categories: [${categoryNames}]. 
          If none fit perfectly, pick the closest one. 
          Respond ONLY with a valid JSON object in this format: {"amount": 12.99, "note": "Walmart", "categoryName": "Groceries"}`
                },
                {
                    role: "user",
                    content: [
                        { type: "image_url", image_url: { url: base64Image } }
                    ]
                }
            ],
            response_format: { type: "json_object" },
        })

        const data = JSON.parse(response.choices[0].message.content || "{}")

        // Find the matching category ID to send back to the form
        const matchedCategory = categories.find(c => c.name === data.categoryName)

        return {
            success: true,
            amount: data.amount,
            note: data.note,
            categoryId: matchedCategory?.id || categories[0]?.id // Fallback to first category if AI guesses wrong
        }
    } catch (error) {
        console.error("AI Scan Error:", error)
        return { success: false }
    }
}