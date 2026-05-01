// Optional dependency — real SDK only required when FIREBLOCKS_ENABLED=true
declare module '@fireblocks/fireblocks-sdk' {
  export class FireblocksSDK {
    constructor(privateKey: string, apiKey: string, baseUrl: string)
    createVaultAccount(...args: unknown[]): Promise<{ id: string }>
    createVaultAsset(...args: unknown[]): Promise<{ address?: string }>
    getVaultAccountById(id: string): Promise<Record<string, unknown>>
    [key: string]: unknown
  }
}
