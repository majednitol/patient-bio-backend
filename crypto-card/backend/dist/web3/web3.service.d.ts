import { ConfigService } from '@nestjs/config';
export declare class Web3Service {
    private configService;
    private accountantAddress;
    private account;
    private publicClient;
    private privateClient;
    private eurToken;
    private usdToken;
    constructor(configService: ConfigService);
    private _getToken;
    getBalance(user: string, currency: 'eur' | 'usd'): Promise<any>;
    acquireHold(user: string, currency: 'eur' | 'usd', amount: number): Promise<void>;
    releaseHold(user: string, currency: 'eur' | 'usd', amount: number): Promise<void>;
}
