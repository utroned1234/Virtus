import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { getSupabaseAdminClient } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'Smart'

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${authResult.user.userId}_${Date.now()}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let supabase
    try {
      supabase = getSupabaseAdminClient()
    } catch (initError) {
      console.error('Supabase init error:', initError)
      return NextResponse.json(
        { error: 'Storage no configurado. Verifica las variables de entorno de Supabase.' },
        { status: 500 }
      )
    }

    // Intentar subir
    let uploadResult
    try {
      uploadResult = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        })
    } catch (uploadError: any) {
      console.error('Supabase upload exception:', uploadError)
      const msg = uploadError?.message || String(uploadError)
      if (msg.includes('JWS') || msg.includes('JWT') || msg.includes('token')) {
        return NextResponse.json(
          { error: 'Error de configuración: Verifica SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Render' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: 'Error al subir archivo: ' + msg }, { status: 500 })
    }

    // Si el bucket no existe, intentar crearlo
    if (uploadResult.error && (uploadResult.error.message.includes('not found') || uploadResult.error.message.includes('Bucket'))) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      })

      if (createError && !createError.message.includes('already exists')) {
        console.error('Error creating bucket:', createError)
        return NextResponse.json({ error: 'Error al crear almacenamiento' }, { status: 500 })
      }

      // Reintentar subida
      uploadResult = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        })
    }

    if (uploadResult.error) {
      console.error('Supabase upload error:', uploadResult.error)
      return NextResponse.json(
        { error: 'Error al subir archivo: ' + uploadResult.error.message },
        { status: 500 }
      )
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicData.publicUrl })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Error al procesar archivo' },
      { status: 500 }
    )
  }
}
