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
exports.CardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const card_service_1 = require("./card.service");
const card_1 = require("../entities/card");
const create_card_1 = require("../dtos/create-card");
const mongoose_1 = require("../interceptors/mongoose");
const pagination_1 = require("../interceptors/pagination");
const update_card_status_1 = require("../dtos/update-card-status");
const update_card_limits_1 = require("../dtos/update-card-limits");
let CardController = class CardController {
    cardService;
    constructor(cardService) {
        this.cardService = cardService;
    }
    async getAll(req) {
        const cardholderId = req.cardholderId;
        return await this.cardService.getAll(cardholderId);
    }
    async getById(id) {
        return await this.cardService.getById(id);
    }
    async createCard(createCardDto, req) {
        const cardholderId = req.cardholderId;
        return await this.cardService.createCard(cardholderId, createCardDto);
    }
    async updateCardStatus(updateCardStatusDto, req) {
        const cardholderId = req.cardholderId;
        return await this.cardService.updateCardStatus(cardholderId, updateCardStatusDto);
    }
    async updateCardLimits(updateCardLimitsDto, req) {
        const cardholderId = req.cardholderId;
        return await this.cardService.updateCardLimits(cardholderId, updateCardLimitsDto);
    }
};
exports.CardController = CardController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all cards' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: [card_1.CardEntity],
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "getAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific card' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: card_1.CardEntity,
    }),
    (0, common_1.Get)('/get/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "getById", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new card for a certain user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: card_1.CardEntity,
    }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_card_1.CreateCardDto, Object]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "createCard", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update card status' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: card_1.CardEntity,
    }),
    (0, common_1.Put)('/status'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_card_status_1.UpdateCardStatusDto, Object]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "updateCardStatus", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update card limits' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: card_1.CardEntity,
    }),
    (0, common_1.Put)('/limits'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_card_limits_1.UpdateCardLimitsDto, Object]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "updateCardLimits", null);
exports.CardController = CardController = __decorate([
    (0, common_1.Controller)('card'),
    (0, common_1.UseInterceptors)(pagination_1.PaginationInterceptor),
    (0, swagger_1.ApiTags)('card'),
    (0, mongoose_1.MongooseClassSerializerInterceptor)(card_1.CardEntity),
    __metadata("design:paramtypes", [card_service_1.CardService])
], CardController);
//# sourceMappingURL=card.controller.js.map