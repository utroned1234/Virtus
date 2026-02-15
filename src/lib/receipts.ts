import { getSupabaseAdminClient } from '@/lib/supabaseClient'

function extractReceiptPath(receiptUrl: string) {
  if (!receiptUrl) return null
  if (receiptUrl.includes('via.placeholder.com')) return null
  if (receiptUrl.startsWith('uploads/')) return receiptUrl

  const publicPrefix = '/storage/v1/object/public/receipts/'
  const prefixIndex = receiptUrl.indexOf(publicPrefix)
  if (prefixIndex >= 0) {
    return receiptUrl.slice(prefixIndex + publicPrefix.length)
  }

  return null
}

export async function deleteReceiptByUrl(receiptUrl?: string | null) {
  const path = receiptUrl ? extractReceiptPath(receiptUrl) : null
  if (!path) return

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (error) {
    console.warn('Supabase admin client not configured. Skipping receipt delete.', error)
    return
  }

  const { error } = await supabase.storage.from('receipts').remove([path])
  if (error) {
    console.warn('Supabase receipt delete error:', error)
  }
}
