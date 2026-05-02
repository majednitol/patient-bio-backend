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
exports.TransactionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const transaction_service_1 = require("./transaction.service");
const transaction_1 = require("../entities/transaction");
const mongoose_1 = require("../interceptors/mongoose");
const public_1 = require("../decorators/public");
let TransactionController = class TransactionController {
    transactionService;
    constructor(transactionService) {
        this.transactionService = transactionService;
    }
    async getAll() {
        return await this.transactionService.getAll();
    }
    async getById(id) {
        return await this.transactionService.getById(id);
    }
    async handleWebhook(req, signature, response) {
        try {
            const status = await this.transactionService.handleWebhook(req.rawBody, signature);
            response.status(200).json({ approved: status });
        }
        catch (error) {
            response.status(400).send(error.message);
        }
    }
};
exports.TransactionController = TransactionController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all transactions' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: [transaction_1.TransactionEntity],
    }),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TransactionController.prototype, "getAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific transaction' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        type: transaction_1.TransactionEntity,
    }),
    (0, common_1.Get)('/get/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TransactionController.prototype, "getById", null);
__decorate([
    (0, public_1.Public)(),
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TransactionController.prototype, "handleWebhook", null);
exports.TransactionController = TransactionController = __decorate([
    (0, common_1.Controller)('transaction'),
    (0, swagger_1.ApiTags)('transaction'),
    (0, mongoose_1.MongooseClassSerializerInterceptor)(transaction_1.TransactionEntity),
    __metadata("design:paramtypes", [transaction_service_1.TransactionService])
], TransactionController);
//# sourceMappingURL=transaction.controller.js.map