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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const siwe_1 = require("siwe");
const user_1 = require("../schemas/user");
const stripe_service_1 = require("../stripe/stripe.service");
let AuthService = class AuthService {
    userModel;
    stripeService;
    jwtService;
    constructor(userModel, stripeService, jwtService) {
        this.userModel = userModel;
        this.stripeService = stripeService;
        this.jwtService = jwtService;
    }
    async generateNonce(wallet) {
        const user = await this.userModel.findOne({ wallet }).exec();
        if (!user)
            throw new common_1.UnauthorizedException();
        user.nonce = (0, siwe_1.generateNonce)();
        await user.save();
        return user.nonce;
    }
    async login(loginDto) {
        const user = await this.userModel
            .findOne({ wallet: loginDto.wallet })
            .exec();
        if (!user)
            throw new common_1.UnauthorizedException({ error: 'User not found' });
        const cardholder = await this.stripeService.searchCardholder(user.cardholderId);
        if (cardholder.status !== 'active')
            throw new common_1.UnauthorizedException({ error: 'Inactive user' });
        try {
            const SIWEObject = new siwe_1.SiweMessage(JSON.parse(loginDto.message));
            const { data: msg } = await SIWEObject.verify({
                signature: loginDto.signature,
                nonce: user.nonce,
            });
            return {
                id: user.id,
                cardholderId: user.cardholderId,
                accessToken: await this.jwtService.signAsync({
                    id: user.id,
                    cardholderId: user.cardholderId,
                }),
            };
        }
        catch (e) {
            if (e == siwe_1.SiweErrorType.EXPIRED_MESSAGE) {
                console.log('Expired message');
                throw new common_1.UnauthorizedException({ error: 'Expired message' });
            }
            else if (e == siwe_1.SiweErrorType.INVALID_SIGNATURE) {
                console.log('Invalid signature');
                throw new common_1.UnauthorizedException({ error: 'Invalid signature' });
            }
            else {
                console.log('Unknown error ' + e.message);
                throw new common_1.UnauthorizedException({ e });
            }
        }
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        stripe_service_1.StripeService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map