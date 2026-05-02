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
exports.DisputeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const dispute_1 = require("../schemas/dispute");
const stripe_service_1 = require("../stripe/stripe.service");
let DisputeService = class DisputeService {
    disputeModel;
    stripeService;
    constructor(disputeModel, stripeService) {
        this.disputeModel = disputeModel;
        this.stripeService = stripeService;
    }
    async getAll() {
        return await this.disputeModel.find().exec();
    }
    async getById(id) {
        const dispute = await this.disputeModel.findById(id).exec();
        if (!dispute)
            throw new common_1.NotFoundException({ error: 'Dispute not found' });
        return dispute;
    }
    async create(createDisputeDto) {
        const dispute = await this.stripeService.createDispute(createDisputeDto);
        const newDispute = new this.disputeModel({
            ...dispute,
        });
        return await newDispute.save();
    }
};
exports.DisputeService = DisputeService;
exports.DisputeService = DisputeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(dispute_1.Dispute.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        stripe_service_1.StripeService])
], DisputeService);
//# sourceMappingURL=dispute.service.js.map