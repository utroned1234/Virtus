import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image } = body // base64 image

    if (!image) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })
    }

    // Convertir base64 a buffer
    const buffer = Buffer.from(image, 'base64')

    // Generar nombre único para el archivo
    const fileName = `profile-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.error('Supabase storage error:', error)

      // Si el bucket no existe, intentar crearlo
      if (error.message.includes('not found') || error.message.includes('Bucket')) {
        // Crear el bucket
        const { error: createError } = await supabase.storage.createBucket('profile-images', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        })

        if (createError && !createError.message.includes('already exists')) {
          console.error('Error creating bucket:', createError)
          return NextResponse.json({ error: 'Error al crear almacenamiento' }, { status: 500 })
        }

        // Reintentar subida
        const { data: retryData, error: retryError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (retryError) {
          console.error('Retry upload error:', retryError)
          return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName)

        return NextResponse.json({
          success: true,
          url: urlData.publicUrl,
        })
      }

      return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
