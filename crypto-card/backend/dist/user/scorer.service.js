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
exports.ScorerService = exports.TransferType = exports.QuoteCurrency = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const coingecko_api_1 = require("coingecko-api");
const axios_1 = require("axios");
const simple_statistics_1 = require("simple-statistics");
const helpers_1 = require("../helpers");
var QuoteCurrency;
(function (QuoteCurrency) {
    QuoteCurrency["EUR"] = "EUR";
    QuoteCurrency["USD"] = "USD";
    QuoteCurrency["GBP"] = "GBP";
})(QuoteCurrency || (exports.QuoteCurrency = QuoteCurrency = {}));
var TransferType;
(function (TransferType) {
    TransferType["IN"] = "IN";
    TransferType["OUT"] = "OUT";
})(TransferType || (exports.TransferType = TransferType = {}));
let ScorerService = class ScorerService {
    configService;
    coinGeckoClient;
    covalentApiKey;
    covalentUrl;
    chainalysisUrl;
    chainalysisApiKey;
    constructor(configService) {
        this.configService = configService;
        this.coinGeckoClient = new coingecko_api_1.default();
        this.covalentApiKey = configService.get('COVALENT_API_KEY') || '';
        this.covalentUrl = configService.get('COVALENT_URL') || '';
        this.chainalysisUrl = configService.get('CHAINALYSIS_URL') || '';
        this.chainalysisApiKey =
            configService.get('CHAINALYSIS_API_KEY') || '';
    }
    async getBlockHeight(chainName, date) {
        const formattedStartDate = date.toISOString().split('T')[0];
        const endDateTime = new Date(date);
        endDateTime.setDate(endDateTime.getDate() + 1);
        const formattedEndDate = endDateTime.toISOString().split('T')[0];
        const url = `${this.covalentUrl}/${chainName}/block_v2/${formattedStartDate}/${formattedEndDate}/`;
        const response = await axios_1.default.get(url, {
            params: { key: this.covalentApiKey },
            timeout: 10000,
        });
        return response.data.data.items[0].height;
    }
    async getWalletAge(chainName, AddressAddress) {
        const url = `${this.covalentUrl}/${chainName}/address/${AddressAddress}/transactions_summary/`;
        const response = await axios_1.default.get(url, {
            params: { key: this.covalentApiKey },
            timeout: 10000,
        });
        return response.data.data;
    }
    async getERC20Transfers(chainName, AddressAddress, tokenAddress, startBlock, endBlock, quoteCurrency) {
        const url = `${this.covalentUrl}/${chainName}/address/${AddressAddress}/transfers_v2/`;
        const response = await axios_1.default.get(url, {
            params: {
                key: this.covalentApiKey,
                'quote-currency': quoteCurrency,
                'contract-address': tokenAddress,
                'starting-block': startBlock,
                'ending-block': endBlock,
            },
            timeout: 60000,
        });
        return response.data.data;
    }
    async getPortfolioValueOverTime(chainName, AddressAddress, days, quoteCurrency) {
        const url = `${this.covalentUrl}/${chainName}/address/${AddressAddress}/portfolio_v2/`;
        const response = await axios_1.default.get(url, {
            params: {
                key: this.covalentApiKey,
                'quote-currency': quoteCurrency,
                days,
            },
            timeout: 60000,
        });
        return response.data.data;
    }
    async isWalletSanctioned(address) {
        const url = `${this.chainalysisUrl}/address/${address}`;
        const response = await axios_1.default.get(url, {
            headers: {
                'X-API-Key': this.chainalysisApiKey,
                Accept: 'application/json',
            },
            timeout: 10000,
        });
        return response.data.identifications.length !== 0;
    }
    async getPrice(slug, currency) {
        const params = {
            tickers: false,
            developer_data: false,
            localization: false,
            market_data: true,
        };
        const data = await this.coinGeckoClient.coins.fetch(slug, params);
        return (data['data']['market_data']['current_price'][currency.toLowerCase()] || 0);
    }
    async analysePortfolioTrend(chainName, walletAddress, days, quoteCurrency) {
        const historicalData = await this.getPortfolioValueOverTime(chainName, walletAddress, days, quoteCurrency);
        const dataForRegression = historicalData.items.map((token, index) => {
            const totalValue = token.holdings.reduce((acc, holding) => acc + holding.close.quote, 0);
            return [index, totalValue];
        });
        const regressionLine = (0, simple_statistics_1.linearRegression)(dataForRegression);
        const startValue = dataForRegression[0][1];
        const endValueProjected = startValue + regressionLine.m * (days - 1);
        const percentageChange = ((endValueProjected - startValue) / startValue) * 100;
        let trend;
        if (regressionLine.m > 0) {
            trend = 'increasing';
        }
        else if (regressionLine.m < 0) {
            trend = 'decreasing';
        }
        else {
            trend = 'neutral';
        }
        return { trend, endValueProjected, percentageChange };
    }
    async analyseRecurrentTransfers(chainName, walletAddress, days, tokenAddress) {
        const currentDate = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(currentDate.getDate() - days);
        const startBlock = await this.getBlockHeight(chainName, ninetyDaysAgo);
        const endBlock = await this.getBlockHeight(chainName, currentDate);
        const transactions = await this.getERC20Transfers(chainName, walletAddress, tokenAddress, startBlock, endBlock, QuoteCurrency.EUR);
        const incoming = [];
        const outgoing = [];
        const incomingBySender = {};
        const outgoingBySender = {};
        for (const transaction of transactions.items) {
            const transfer = transaction.transfers[0];
            if (transfer.transfer_type === TransferType.IN) {
                incoming.push(transfer);
                if (!incomingBySender[transfer.from_address]) {
                    incomingBySender[transfer.from_address] = [];
                }
                incomingBySender[transfer.from_address].push(transfer);
            }
            else {
                outgoing.push(transfer);
                if (!outgoingBySender[transfer.to_address]) {
                    outgoingBySender[transfer.to_address] = [];
                }
                outgoingBySender[transfer.to_address].push(transfer);
            }
        }
        const recurringTransactions = [];
        incoming.sort((a, b) => new Date(a.block_signed_at).getTime() -
            new Date(b.block_signed_at).getTime());
        for (let i = 1; i < incoming.length; i++) {
            const currentTx = incoming[i];
            const previousTx = incoming[i - 1];
            const currentDate = new Date(currentTx.block_signed_at);
            const previousDate = new Date(previousTx.block_signed_at);
            const intervalInDays = (currentDate.getTime() - previousDate.getTime()) / (24 * 3600 * 1000);
            if ((0, helpers_1.isDateWithinRange)(previousDate, currentDate, intervalInDays) &&
                (0, helpers_1.isNumberWithinRange)(previousTx.delta, currentTx.delta)) {
                recurringTransactions.push(currentTx);
            }
        }
    }
    async runScoringChecks(walletAddress, chain, quoteCurrency) {
        console.log(`******** Started analysis of ${walletAddress} ********`);
        let totalPoints = 0;
        const walletSummary = await this.getWalletAge(chain.chainName, walletAddress);
        if (walletSummary.items === null ||
            walletSummary.items[0].total_count <= 20) {
            console.log('too few transactions');
        }
        const walletCreationDate = new Date(walletSummary.items[0].earliest_transaction.block_signed_at);
        const currentDate = new Date();
        const ageInDays = (currentDate.getTime() - walletCreationDate.getTime()) /
            (1000 * 3600 * 24);
        if (ageInDays < 90) {
            console.log('too fresh wallet');
        }
        const latestTransactionDate = new Date(walletSummary.items[0].latest_transaction.block_signed_at);
        const daysSinceLastTransaction = (currentDate.getTime() - latestTransactionDate.getTime()) /
            (1000 * 3600 * 24);
        if (daysSinceLastTransaction > 30) {
            console.log('idle wallet');
        }
        console.log('Check if the wallet has a positive balance trend in the last 90 days');
        const { trend, endValueProjected, percentageChange } = await this.analysePortfolioTrend(chain.chainName, walletAddress, 90, quoteCurrency);
        console.log('trend', trend);
        console.log('percentageChange', percentageChange);
        for (const token of chain.tokens) {
            console.log('Check if the wallet has received recurrent transfers (a salary) in the last 90 days for token ' +
                token.contract_ticker_symbol);
            await this.analyseRecurrentTransfers(chain.chainName, walletAddress, 90, token.contract_address);
        }
        console.log(`******** Completed analysis of ${walletAddress} ********`);
        if (walletSummary.items[0].total_count > 50) {
            totalPoints += 10;
        }
        if (ageInDays > 360) {
            totalPoints += 20;
        }
        else if (ageInDays > 180) {
            totalPoints += 10;
        }
        if (daysSinceLastTransaction < 30) {
            totalPoints += 20;
        }
        else if (daysSinceLastTransaction < 60) {
            totalPoints += 10;
        }
        if (trend === 'increasing') {
            totalPoints += 20;
        }
        else if (trend === 'decreasing') {
            totalPoints -= 10;
        }
        if (endValueProjected > 100000) {
            totalPoints += 30;
        }
        else if (endValueProjected > 10000) {
            totalPoints += 10;
        }
        else if (endValueProjected < 5000) {
            totalPoints -= 10;
        }
        return totalPoints;
    }
};
exports.ScorerService = ScorerService;
exports.ScorerService = ScorerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ScorerService);
//# sourceMappingURL=scorer.service.js.map