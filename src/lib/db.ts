import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
if (typeof global !== 'undefined' && !globalForPrisma.prisma) {
  process.on('exit', () => {
    globalForPrisma.prisma?.$disconnect()
  })
  process.on('SIGINT', () => {
    globalForPrisma.prisma?.$disconnect().then(() => process.exit(0))
  })
}

// Helper para ejecutar queries con manejo de conexión mejorado
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1
): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    if (retries > 0 && (
      error?.code === 'P1001' || // Can't reach database server
      error?.code === 'P1002' || // Database server timed out
      error?.code === 'P1008' || // Operations timed out
      error?.code === 'P1017' || // Server closed connection
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('timeout')
    )) {
      console.warn(`Connection error, retrying... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 300))
      return withRetry(fn, retries - 1)
    }
    throw error
  }
}

