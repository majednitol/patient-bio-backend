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
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
let StripeService = class StripeService {
    configService;
    stripe;
    webhookSecret;
    constructor(configService) {
        this.configService = configService;
        this.stripe = new stripe_1.default(configService.get('STRIPE_SECRET_KEY') || '');
        this.webhookSecret =
            this.configService.get('STRIPE_WEBHOOK_SECRET') || '';
    }
    async getAllCardholders() {
        return await this.stripe.issuing.cardholders.list();
    }
    async searchCardholder(params) {
        return await this.stripe.issuing.cardholders.retrieve(params);
    }
    async createCardholder(params) {
        return await this.stripe.issuing.cardholders.create(params);
    }
    async updateCardholder(id, params) {
        return await this.stripe.issuing.cardholders.update(id, params);
    }
    async getAllCards() {
        return await this.stripe.issuing.cards.list();
    }
    async searchCard(params) {
        return await this.stripe.issuing.cards.retrieve(params);
    }
    async createCard(params) {
        return await this.stripe.issuing.cards.create(params);
    }
    async updateCard(id, params) {
        return await this.stripe.issuing.cards.update(id, params);
    }
    async getAllTransactions() {
        return await this.stripe.issuing.transactions.list();
    }
    async searchTransaction(params) {
        return await this.stripe.issuing.transactions.retrieve(params);
    }
    async getAllAuthorisations() {
        return await this.stripe.issuing.authorizations.list();
    }
    async searchAuthorisation(params) {
        return await this.stripe.issuing.authorizations.retrieve(params);
    }
    async processAuthorisation(id, approve, params) {
        if (approve)
            return await this.stripe.issuing.authorizations.approve(id, params);
        else
            return await this.stripe.issuing.authorizations.decline(id, params);
    }
    async getAllDisputes() {
        return await this.stripe.issuing.disputes.list();
    }
    async searchDispute(params) {
        return await this.stripe.issuing.disputes.retrieve(params);
    }
    async createDispute(params) {
        return await this.stripe.issuing.disputes.create(params);
    }
    async submitDispute(id, params) {
        return await this.stripe.issuing.disputes.submit(id, params);
    }
    async constructEvent(requestBody, signature) {
        return this.stripe.webhooks.constructEvent(requestBody, signature, this.webhookSecret);
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map