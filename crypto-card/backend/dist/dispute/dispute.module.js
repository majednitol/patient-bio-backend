"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const stripe_service_1 = require("../stripe/stripe.service");
const dispute_service_1 = require("./dispute.service");
const dispute_controller_1 = require("./dispute.controller");
const dispute_1 = require("../schemas/dispute");
let DisputeModule = class DisputeModule {
};
exports.DisputeModule = DisputeModule;
exports.DisputeModule = DisputeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: dispute_1.Dispute.name, schema: dispute_1.DisputeSchema }]),
        ],
        controllers: [dispute_controller_1.DisputeController],
        providers: [dispute_service_1.DisputeService, stripe_service_1.StripeService],
    })
], DisputeModule);
//# sourceMappingURL=dispute.module.js.map