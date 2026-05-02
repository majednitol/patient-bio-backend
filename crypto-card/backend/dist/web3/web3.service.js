"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Service = void 0;
const common_1 = require("@nestjs/common");
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const accounts_1 = require("viem/accounts");
const accountant_abi_1 = require("./accountant.abi");
const config_1 = require("@nestjs/config");
let Web3Service = class Web3Service {
    configService;
    accountantAddress;
    account;
    publicClient;
    privateClient;
    eurToken;
    usdToken;
    constructor(configService) {
        this.configService = configService;
        const privateKey = configService.get('WALLET_PRIVATE_KEY') || '';
        this.eurToken = configService.get('EUR_TOKEN') || '';
        this.usdToken = configService.get('USD_TOKEN') || '';
        this.accountantAddress =
            configService.get('ACCOUNTANT_ADDRESS') || '';
        this.account = (0, accounts_1.privateKeyToAccount)(privateKey);
        this.publicClient = (0, viem_1.createPublicClient)({
            chain: chains_1.sepolia,
            transport: (0, viem_1.http)(),
        });
        this.privateClient = (0, viem_1.createWalletClient)({
            account: this.account,
            chain: chains_1.sepolia,
            transport: (0, viem_1.http)(),
        });
    }
    _getToken(currency) {
        if (currency === 'eur')
            return this.eurToken;
        else if (currency === 'usd')
            return this.usdToken;
        else
            throw new Error('Invalid currency');
    }
    async getBalance(user, currency) {
        const token = this._getToken(currency);
        const balance = await this.publicClient.readContract({
            address: this.accountantAddress,
            abi: accountant_abi_1.AccountantABI,
            functionName: 'checkBalance',
            args: [user, token],
        });
        return balance;
    }
    async acquireHold(user, currency, amount) {
        const token = this._getToken(currency);
        const { request } = await this.publicClient.simulateContract({
            account: this.account,
            address: this.accountantAddress,
            abi: accountant_abi_1.AccountantABI,
            functionName: 'acquireHold',
            args: [user, token, amount],
        });
        await this.privateClient.writeContract(request);
    }
    async releaseHold(user, currency, amount) {
        const token = this._getToken(currency);
        const { request } = await this.publicClient.simulateContract({
            account: this.account,
            address: this.accountantAddress,
            abi: accountant_abi_1.AccountantABI,
            functionName: 'releaseHold',
            args: [user, token, amount],
        });
        await this.privateClient.writeContract(request);
    }
};
exports.Web3Service = Web3Service;
exports.Web3Service = Web3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], Web3Service);
//# sourceMappingURL=web3.service.js.map