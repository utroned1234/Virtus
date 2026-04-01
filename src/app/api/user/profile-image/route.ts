import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const body = await req.json()
    const { image_url } = body

    if (!image_url) {
      return NextResponse.json({ error: 'URL de imagen requerida' }, { status: 400 })
    }

    // Actualizar la foto de perfil del usuario
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: { profile_image_url: image_url },
      select: {
        id: true,
        username: true,
        full_name: true,
        profile_image_url: true,
      },
    })

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Error updating profile image:', error)
    return NextResponse.json({ error: 'Error al actualizar la imagen' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        profile_image_url: true,
      },
    })

    return NextResponse.json({
      profile_image_url: user?.profile_image_url || null,
    })
  } catch (error) {
    console.error('Error fetching profile image:', error)
    return NextResponse.json({ error: 'Error al obtener la imagen' }, { status: 500 })
  }
}
