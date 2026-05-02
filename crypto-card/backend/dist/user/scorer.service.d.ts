import { ConfigService } from '@nestjs/config';
export type Address = string;
export declare enum QuoteCurrency {
    EUR = "EUR",
    USD = "USD",
    GBP = "GBP"
}
export type TransactionBase = {
    block_signed_at: string;
    tx_hash: string;
};
export declare enum TransferType {
    IN = "IN",
    OUT = "OUT"
}
export type Transfer = {
    transfer_type: TransferType;
    from_address: Address;
    from_address_label?: string;
    to_address: Address;
    to_address_label?: string;
    delta: string;
    balance?: number;
    balance_quote?: number;
    delta_quote?: number;
    quote_rate?: number;
} & TransactionBase;
export type TransactionExtended = {
    block_height: number;
    successful: boolean;
    value: string;
    value_quote: number;
    from_address: Address;
    from_address_label?: string;
    to_address: Address;
    to_address_label?: string;
    transfers: Transfer[];
} & TransactionBase;
export type Summary = {
    total_count: number;
    earliest_transaction: TransactionBase;
    latest_transaction: TransactionBase;
};
export type TransactionsSummary = {
    items: Summary[];
};
export type Erc20Transfers = {
    items: TransactionExtended[];
};
export type Value = {
    balance: string;
    quote: number;
    pretty_quote: string;
};
export type TokenHoldingValue = {
    quote_rate: number;
    timestamp: number;
    close: Value;
    high: Value;
    low: Value;
    open: Value;
};
export type Token = {
    contract_decimals: number;
    contract_name: string;
    contract_ticker_symbol: string;
    contract_address: Address;
    logo_url: string;
    holdings: TokenHoldingValue[];
};
export type Chain = {
    chainName: string;
    chainId: number;
    tokens: Token[];
};
export type HistoricalPortfolioBalance = {
    items: Token[];
};
export declare class ScorerService {
    private configService;
    private coinGeckoClient;
    private covalentApiKey;
    private covalentUrl;
    private chainalysisUrl;
    private chainalysisApiKey;
    constructor(configService: ConfigService);
    getBlockHeight(chainName: string, date: Date): Promise<number>;
    getWalletAge(chainName: string, AddressAddress: string): Promise<TransactionsSummary>;
    getERC20Transfers(chainName: string, AddressAddress: string, tokenAddress: string, startBlock: number, endBlock: number, quoteCurrency: QuoteCurrency): Promise<Erc20Transfers>;
    getPortfolioValueOverTime(chainName: string, AddressAddress: string, days: number, quoteCurrency: QuoteCurrency): Promise<HistoricalPortfolioBalance>;
    isWalletSanctioned(address: string): Promise<boolean>;
    getPrice(slug: string, currency: QuoteCurrency): Promise<number>;
    analysePortfolioTrend(chainName: string, walletAddress: string, days: number, quoteCurrency: QuoteCurrency): Promise<{
        trend: 'increasing' | 'decreasing' | 'neutral';
        endValueProjected: number;
        percentageChange: number;
    }>;
    analyseRecurrentTransfers(chainName: string, walletAddress: Address, days: number, tokenAddress: Address): Promise<void>;
    runScoringChecks(walletAddress: Address, chain: Chain, quoteCurrency: QuoteCurrency): Promise<number>;
}
