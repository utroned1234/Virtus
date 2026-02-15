import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getSupabaseAdminClient } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no válido. Use JPG, PNG, WEBP o GIF' },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es muy grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `product_${Date.now()}.${fileExt}`
    const filePath = `products/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let supabase
    try {
      supabase = getSupabaseAdminClient()
    } catch (initError) {
      console.error('Supabase init error:', initError)
      return NextResponse.json({
        error: 'Storage no configurado',
      }, { status: 500 })
    }

    // Upload to Supabase Storage in 'Smart' bucket
    const { data, error } = await supabase.storage
      .from('Smart')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({
        error: 'Error al subir imagen: ' + error.message,
      }, { status: 500 })
    }

    const { data: publicData } = supabase.storage
      .from('Smart')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      image_url: publicData.publicUrl
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Error al procesar archivo' },
      { status: 500 }
    )
  }
}
