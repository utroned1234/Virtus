import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

async function updateImages() {
  console.log('Actualizando imágenes...')

  // Eliminar banners anteriores
  await prisma.banner.deleteMany()
  console.log('✓ Banners anteriores eliminados')

  // Banners del carrusel superior (HOME_TOP)
  const topBanners = [
    'https://i.ibb.co/RpQSqpY7/Mesa-de-trabajo-6.png',
    'https://i.ibb.co/PsNP84yQ/Mesa-de-trabajo-6.png',
    'https://i.ibb.co/jZMp1JQZ/Mesa-de-trabajo-3.jpg',
    'https://i.ibb.co/DHp30Hx1/Mesa-de-trabajo-7.jpg',
  ]

  for (let i = 0; i < topBanners.length; i++) {
    await prisma.banner.create({
      data: {
        location: 'HOME_TOP',
        image_url: topBanners[i],
        order: i + 1,
        is_active: true,
      },
    })
  }
  console.log(`✓ ${topBanners.length} banners superiores creados`)

  // Banner del carrusel inferior (HOME_BOTTOM)
  await prisma.banner.create({
    data: {
      location: 'HOME_BOTTOM',
      image_url: 'https://i.ibb.co/9HPHLcGj/Mesa-de-trabajo-1.jpg',
      order: 1,
      is_active: true,
    },
  })
  console.log('✓ 1 banner inferior creado')

  // Actualizar QR de pago en todos los paquetes VIP
  const qrUrl = 'https://i.ibb.co/jZMp1JQZ/Mesa-de-trabajo-3.jpg'

  await prisma.vipPackage.updateMany({
    data: {
      qr_image_url: qrUrl,
    },
  })
  console.log('✓ QR de pago actualizado en todos los paquetes VIP')

  console.log('\n✅ Imágenes actualizadas exitosamente!')
  console.log('\nResumen:')
  console.log(`- 4 banners superiores (HOME_TOP)`)
  console.log(`- 1 banner inferior (HOME_BOTTOM)`)
  console.log(`- QR de pago: ${qrUrl}`)
}

updateImages()
  .catch((e) => {
    console.error('Error actualizando imágenes:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
