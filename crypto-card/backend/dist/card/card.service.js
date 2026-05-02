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
exports.CardService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const card_1 = require("../schemas/card");
const stripe_service_1 = require("../stripe/stripe.service");
let CardService = class CardService {
    cardModel;
    stripeService;
    constructor(cardModel, stripeService) {
        this.cardModel = cardModel;
        this.stripeService = stripeService;
    }
    async getAll(cardholderId) {
        return await this.cardModel.find({ cardholderId }).exec();
    }
    async getById(id) {
        const card = await this.cardModel.findById(id).exec();
        if (!card)
            throw new common_1.NotFoundException({ error: 'Card not found' });
        return card;
    }
    async createCard(cardholderId, createCardDto) {
        const user = await this.stripeService.searchCardholder(cardholderId);
        if (!user)
            throw new common_1.NotFoundException({ error: 'User not found' });
        const cardData = {
            cardholder: cardholderId,
            type: createCardDto.type,
            currency: createCardDto.currency,
        };
        const shippingData = null;
        if (createCardDto.type === 'physical') {
            cardData.shipping = {
                address: {
                    city: user.billing.address.city,
                    country: user.billing.address.country,
                    line1: user.billing.address.line1,
                    postal_code: user.billing.address.postal_code,
                },
                name: user.individual?.first_name + ' ' + user.individual?.last_name,
                phone_number: user.phone_number,
                service: 'standard',
            };
            if (user.billing.address.line2) {
                shippingData.address.line2 = user.billing.address.line2;
            }
            if (user.billing.address.state) {
                shippingData.address.state = user.billing.address.state;
            }
        }
        const card = await this.stripeService.createCard(cardData);
        const newCard = new this.cardModel({
            cardId: card.id,
            cardholderId: card.cardholder.id,
            type: card.type,
            currency: card.currency,
            expMonth: card.exp_month,
            expYear: card.exp_year,
            last4: card.last4,
            brand: 'Visas',
            status: card.status,
        });
        return await newCard.save();
    }
    async updateCardStatus(cardholderId, updateCardStatusDto) {
        const updatedCard = await this.cardModel
            .findOneAndUpdate({ cardId: updateCardStatusDto.cardId, cardholderId: cardholderId }, { status: updateCardStatusDto.status }, { new: true })
            .exec();
        if (!updatedCard)
            throw new common_1.NotFoundException({ error: 'Card not found' });
        await this.stripeService.updateCard(updateCardStatusDto.cardId, {
            status: updateCardStatusDto.status,
        });
        return updatedCard;
    }
    async updateCardLimits(cardholderId, updateCardLimitsDto) {
        const updatedCard = await this.cardModel
            .findOneAndUpdate({ cardId: updateCardLimitsDto.cardId, cardholderId: cardholderId }, {
            $set: {
                limits: {
                    monthlyLimit: updateCardLimitsDto.monthlyLimit,
                    singleTxLimit: updateCardLimitsDto.singleTxLimit,
                }
            }
        }, { new: true, upsert: true })
            .exec();
        if (!updatedCard)
            throw new common_1.NotFoundException({ error: 'Card not found' });
        await this.stripeService.updateCard(updateCardLimitsDto.cardId, {
            spending_controls: {
                spending_limits: [
                    {
                        amount: updateCardLimitsDto.monthlyLimit,
                        interval: 'monthly',
                    },
                    {
                        amount: updateCardLimitsDto.singleTxLimit,
                        interval: 'per_authorization',
                    },
                ],
            },
        });
        return updatedCard;
    }
};
exports.CardService = CardService;
exports.CardService = CardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(card_1.Card.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        stripe_service_1.StripeService])
], CardService);
//# sourceMappingURL=card.service.js.map