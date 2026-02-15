import { ethers } from 'ethers'

// USDT BEP-20 Transfer event ABI (ERC-20 standard)
const ERC20_TRANSFER_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]

const USDT_DECIMALS = 18 // USDT on BSC uses 18 decimals

interface VerificationResult {
  verified: boolean
  error?: string
  from?: string
  to?: string
  amount?: number
  confirmations?: number
  blockNumber?: number
}

/**
 * Verifies a BSC transaction hash is a valid USDT BEP-20 transfer
 * to the expected receiver address for the expected amount.
 */
export async function verifyBscTransaction(
  txHash: string,
  expectedAmountUsdt: number,
  requiredConfirmations: number = 12
): Promise<VerificationResult> {
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
  const receiverAddress = process.env.PAYMENT_RECEIVER_ADDRESS!
  const usdtContract = process.env.USDT_BSC_CONTRACT_ADDRESS!

  const provider = new ethers.JsonRpcProvider(rpcUrl)

  // 1. Fetch the transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash)
  if (!receipt) {
    return { verified: false, error: 'TX_NOT_FOUND' }
  }

  // 2. Check the transaction was successful
  if (receipt.status !== 1) {
    return { verified: false, error: 'TX_FAILED' }
  }

  // 3. Check it interacted with the USDT contract
  if (receipt.to?.toLowerCase() !== usdtContract.toLowerCase()) {
    return { verified: false, error: 'WRONG_CONTRACT' }
  }

  // 4. Parse the Transfer event from logs
  const iface = new ethers.Interface(ERC20_TRANSFER_ABI)
  let transferFound = false
  let from = ''
  let to = ''
  let amount = 0

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdtContract.toLowerCase()) continue
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
      if (parsed && parsed.name === 'Transfer') {
        from = parsed.args[0]
        to = parsed.args[1]
        const rawAmount = parsed.args[2] as bigint
        amount = parseFloat(ethers.formatUnits(rawAmount, USDT_DECIMALS))
        transferFound = true
        break
      }
    } catch {
      // Not a Transfer event, skip
    }
  }

  if (!transferFound) {
    return { verified: false, error: 'NO_TRANSFER_EVENT' }
  }

  // 5. Verify the recipient matches
  if (to.toLowerCase() !== receiverAddress.toLowerCase()) {
    return { verified: false, error: 'WRONG_RECIPIENT', from, to, amount }
  }

  // 6. Verify the amount (allow 0.5 USDT tolerance)
  if (amount < expectedAmountUsdt - 0.5) {
    return { verified: false, error: 'INSUFFICIENT_AMOUNT', from, to, amount }
  }

  // 7. Check confirmations
  const currentBlock = await provider.getBlockNumber()
  const confirmations = currentBlock - receipt.blockNumber

  if (confirmations < requiredConfirmations) {
    return {
      verified: false,
      error: 'INSUFFICIENT_CONFIRMATIONS',
      from,
      to,
      amount,
      confirmations,
      blockNumber: receipt.blockNumber,
    }
  }

  return {
    verified: true,
    from,
    to,
    amount,
    confirmations,
    blockNumber: receipt.blockNumber,
  }
}

/**
 * Quick check: does the tx exist on chain yet?
 */
export async function txExistsOnChain(txHash: string): Promise<boolean> {
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const tx = await provider.getTransaction(txHash)
  return tx !== null
}
