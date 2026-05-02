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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const transaction_1 = require("../schemas/transaction");
const user_1 = require("../schemas/user");
const stripe_service_1 = require("../stripe/stripe.service");
const web3_service_1 = require("../web3/web3.service");
let TransactionService = class TransactionService {
    userModel;
    transactionModel;
    stripeService;
    web3Service;
    constructor(userModel, transactionModel, stripeService, web3Service) {
        this.userModel = userModel;
        this.transactionModel = transactionModel;
        this.stripeService = stripeService;
        this.web3Service = web3Service;
    }
    async getAll() {
        return await this.transactionModel.find().exec();
    }
    async getById(id) {
        const transaction = await this.transactionModel.findById(id).exec();
        if (!transaction)
            throw new common_1.NotFoundException({ error: 'Transaction not found' });
        return transaction;
    }
    async handleWebhook(requestBody, signature) {
        let event;
        try {
            event = await this.stripeService.constructEvent(requestBody, signature);
        }
        catch (err) {
            throw new Error(`Webhook Error: ${err.message}`);
        }
        const data = event.data.object;
        const user = await this.userModel
            .findOne({ cardholderId: data.cardholder })
            .exec();
        if (!user?.wallet)
            return false;
        const amount = data.pending_request.amount;
        const currency = data.pending_request.currency;
        const userBalance = await this.web3Service.getBalance(user.wallet, currency);
        if (event.type === 'issuing_authorization.created') {
            if (userBalance < amount)
                return false;
            await this.web3Service.acquireHold(user.wallet, currency, amount);
            return true;
        }
        else if (event.type === 'issuing_authorization.updated' &&
            data.pending_request.amount === 0) {
            await this.web3Service.releaseHold(user.wallet, currency, amount);
        }
        return false;
    }
};
exports.TransactionService = TransactionService;
exports.TransactionService = TransactionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(transaction_1.Transaction.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        stripe_service_1.StripeService,
        web3_service_1.Web3Service])
], TransactionService);
//# sourceMappingURL=transaction.service.js.map