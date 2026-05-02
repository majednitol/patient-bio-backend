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
exports.DisputeController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dispute_1 = require("../entities/dispute");
const dispute_service_1 = require("./dispute.service");
const mongoose_1 = require("../interceptors/mongoose");
const pagination_1 = require("../interceptors/pagination");
let DisputeController = class DisputeController {
    disputeService;
    constructor(disputeService) {
        this.disputeService = disputeService;
    }
    async getAll() {
        return await this.disputeService.getAll();
    }
    async getById(id) {
        return await this.disputeService.getById(id);
    }
    async createDispute(createDisputeDto) {
        return await this.disputeService.create(createDisputeDto);
    }
};
exports.DisputeController = DisputeController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all disputes' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: [dispute_1.DisputeEntity],
    }),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DisputeController.prototype, "getAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific dispute' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: dispute_1.DisputeEntity,
    }),
    (0, common_1.Get)('/get/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DisputeController.prototype, "getById", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: dispute_1.DisputeEntity,
    }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputeController.prototype, "createDispute", null);
exports.DisputeController = DisputeController = __decorate([
    (0, common_1.Controller)('dispute'),
    (0, swagger_1.ApiTags)('dispute'),
    (0, mongoose_1.MongooseClassSerializerInterceptor)(dispute_1.DisputeEntity),
    (0, common_1.UseInterceptors)(pagination_1.PaginationInterceptor),
    __metadata("design:paramtypes", [dispute_service_1.DisputeService])
], DisputeController);
//# sourceMappingURL=dispute.controller.js.map