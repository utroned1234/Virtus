'use client'

import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { defineChain } from '@reown/appkit/networks'

// BSC Mainnet definition
const bscMainnet = defineChain({
  id: 56,
  caipNetworkId: 'eip155:56',
  chainNamespace: 'eip155',
  name: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.binance.org/'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
})

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

const metadata = {
  name: 'VIRTUS',
  description: 'Plataforma VIRTUS Premium',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://virtus.app',
  icons: ['/logo.png'],
}

const ethersAdapter = new EthersAdapter()

let appKitInstance: ReturnType<typeof createAppKit> | null = null

export function getAppKit() {
  if (!appKitInstance && projectId) {
    appKitInstance = createAppKit({
      adapters: [ethersAdapter],
      networks: [bscMainnet],
      defaultNetwork: bscMainnet,
      projectId,
      metadata,
      features: {
        analytics: false,
      },
      featuredWalletIds: [
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      ],
    })
  }
  return appKitInstance
}

export { ethersAdapter, bscMainnet }
