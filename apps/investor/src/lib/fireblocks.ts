// apps/investor/src/lib/fireblocks.ts
// Fireblocks institutional custody integration
// Set FIREBLOCKS_ENABLED=true in production when ready
// Docs: https://developers.fireblocks.com/reference/

import { readFileSync } from 'fs'

interface FireblocksVault {
  id: string
  name: string
  assets: Array<{
    id: string        // "USDC_POLYGON", "USDT_POLYGON", "ETH"
    total: string
    available: string
    pending: string
    blockchainSymbol?: string
    address?: string
  }>
}

interface FireblocksTransaction {
  id: string
  status: string
  assetId: string
  amount: number
  destinationAddress: string
  txHash?: string
}

class FireblocksClient {
  private baseUrl: string
  private apiKey: string
  private privateKey: string | null

  constructor() {
    this.baseUrl = process.env.FIREBLOCKS_BASE_URL ?? 'https://api.fireblocks.io'
    this.apiKey = process.env.FIREBLOCKS_API_KEY ?? ''
    this.privateKey = null

    if (process.env.FIREBLOCKS_PRIVATE_KEY_PATH) {
      try {
        this.privateKey = readFileSync(process.env.FIREBLOCKS_PRIVATE_KEY_PATH, 'utf8')
      } catch (err) {
        console.error('[Fireblocks] Failed to load private key:', err)
      }
    }
  }

  private isEnabled(): boolean {
    return process.env.FIREBLOCKS_ENABLED === 'true' && !!this.apiKey && !!this.privateKey
  }

  private async signedRequest(method: string, path: string, body?: any): Promise<any> {
    if (!this.isEnabled()) {
      throw new Error('Fireblocks is not enabled. Set FIREBLOCKS_ENABLED=true and configure credentials.')
    }

    // JWT signing for Fireblocks API
    // In production, use the official @fireblocks/fireblocks-sdk npm package
    // which handles the RS256 JWT signing automatically
    const { FireblocksSDK } = await import('@fireblocks/fireblocks-sdk').catch(() => {
      throw new Error('Fireblocks SDK not installed. Run: pnpm add @fireblocks/fireblocks-sdk')
    })

    const sdk = new FireblocksSDK(this.privateKey!, this.apiKey, this.baseUrl)
    return sdk
  }

  async createVaultAccount(investorId: string, name: string): Promise<{ vaultId: string; address: string }> {
    if (!this.isEnabled()) {
      // Return mock for development
      console.warn('[Fireblocks] Not enabled — returning mock vault')
      return { vaultId: `mock-vault-${investorId}`, address: `0x${investorId.replace(/-/g, '').slice(0, 40)}` }
    }

    const sdk = await this.signedRequest('POST', '/v1/vault/accounts')
    const vault = await sdk.createVaultAccount(name, false, `nexus-investor-${investorId}`)
    await sdk.createVaultAsset(vault.id, 'USDC_POLYGON')
    await sdk.createVaultAsset(vault.id, 'USDT_POLYGON')
    const ethAsset = await sdk.createVaultAsset(vault.id, 'ETH')

    return {
      vaultId: vault.id,
      address: ethAsset.address,
    }
  }

  async getVaultBalances(vaultId: string): Promise<Array<{ currency: string; balance: number; address: string }>> {
    if (!this.isEnabled()) {
      return [] // Database balances are used when Fireblocks is not connected
    }

    const sdk = await this.signedRequest('GET', `/v1/vault/accounts/${vaultId}`)
    const vault: FireblocksVault = await sdk.getVaultAccountById(vaultId)

    const currencyMap: Record<string, string> = {
      'USDC_POLYGON': 'USDC',
      'USDT_POLYGON': 'USDT',
      'ETH': 'ETH',
    }

    return vault.assets
      .filter((a) => currencyMap[a.id])
      .map((a) => ({
        currency: currencyMap[a.id],
        balance: parseFloat(a.available),
        address: a.address ?? '',
      }))
  }

  async createDepositAddress(vaultId: string, assetId: string): Promise<string> {
    if (!this.isEnabled()) {
      return `0x${vaultId.replace(/-/g, '').slice(0, 40)}`
    }

    const sdk = await this.signedRequest('POST', `/v1/vault/accounts/${vaultId}/${assetId}/addresses`)
    const result = await sdk.generateNewAddress(vaultId, assetId)
    return result.address
  }

  async initiateWithdrawal(
    vaultId: string,
    assetId: string,
    destinationAddress: string,
    amount: number,
    note: string
  ): Promise<{ transactionId: string }> {
    if (!this.isEnabled()) {
      throw new Error('Fireblocks is not enabled. Withdrawals require production custody configuration.')
    }

    const sdk = await this.signedRequest('POST', '/v1/transactions')
    const tx: FireblocksTransaction = await sdk.createTransaction({
      assetId,
      source: { type: 'VAULT_ACCOUNT', id: vaultId },
      destination: { type: 'ONE_TIME_ADDRESS', oneTimeAddress: { address: destinationAddress } },
      amount: amount.toString(),
      note,
    })

    return { transactionId: tx.id }
  }
}

// Singleton
let _client: FireblocksClient | null = null

export function getFireblocksClient(): FireblocksClient {
  if (!_client) _client = new FireblocksClient()
  return _client
}

// Convenience functions used by wallet API
export async function provisionInvestorWallet(
  userId: string,
  investorProfileId: string
): Promise<{ vaultId: string; address: string }> {
  const client = getFireblocksClient()
  const { vaultId, address } = await client.createVaultAccount(userId, `nexus-${userId}`)

  // Update the wallet records with Fireblocks data
  await (await import('@nexus/db')).prisma.wallet.updateMany({
    where: { investorProfileId },
    data: { fireblocksVaultId: vaultId, fireblocksAddress: address },
  })

  return { vaultId, address }
}

export async function syncWalletBalances(investorProfileId: string): Promise<void> {
  const { prisma } = await import('@nexus/db')

  const wallets = await prisma.wallet.findMany({
    where: { investorProfileId, fireblocksVaultId: { not: null } },
  })

  if (wallets.length === 0) return

  const vaultId = wallets[0].fireblocksVaultId!
  const client = getFireblocksClient()

  try {
    const balances = await client.getVaultBalances(vaultId)
    for (const { currency, balance } of balances) {
      await prisma.wallet.updateMany({
        where: { investorProfileId, currency },
        data: { balance },
      })
    }
  } catch (err) {
    console.error('[Fireblocks] Balance sync failed:', err)
  }
}
