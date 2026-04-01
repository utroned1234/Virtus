import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    const packages = await prisma.vipPackage.findMany({
        orderBy: { level: 'asc' },
    })
    console.log('---BEGIN_PACKAGES_JSON---')
    console.log(JSON.stringify(packages, null, 2))
    console.log('---END_PACKAGES_JSON---')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
