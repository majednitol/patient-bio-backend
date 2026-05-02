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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const stripe_service_1 = require("../stripe/stripe.service");
const user_1 = require("../schemas/user");
let UserService = class UserService {
    userModel;
    stripeService;
    constructor(userModel, stripeService) {
        this.userModel = userModel;
        this.stripeService = stripeService;
    }
    async getAll() {
        return await this.userModel.find().exec();
    }
    async getById(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user)
            throw new common_1.NotFoundException({ error: 'User not found' });
        return user;
    }
    async create(createUserDto) {
        try {
            const cardholder = await this.stripeService.createCardholder({
                name: createUserDto.firstName + ' ' + createUserDto.lastName,
                email: createUserDto.email,
                phone_number: createUserDto.phone,
                status: 'active',
                type: 'individual',
                individual: {
                    first_name: createUserDto.firstName,
                    last_name: createUserDto.lastName,
                    dob: {
                        day: createUserDto.dob.getDate(),
                        month: createUserDto.dob.getMonth() + 1,
                        year: createUserDto.dob.getFullYear(),
                    },
                },
                billing: {
                    address: {
                        line1: createUserDto.address,
                        city: createUserDto.city,
                        postal_code: createUserDto.poBox,
                        country: createUserDto.countryCode,
                    },
                },
            });
            const newCardholder = new this.userModel({
                cardholderId: cardholder.id,
                firstName: createUserDto.firstName,
                lastName: createUserDto.lastName,
                email: createUserDto.email,
                phone: createUserDto.phone,
                wallet: createUserDto.wallet,
                signature: createUserDto.signature,
            });
            return await newCardholder.save();
        }
        catch (error) {
            throw new common_1.BadRequestException({ message: [error.message] });
        }
    }
    async update(updateUserDto) {
        const cardholder = await this.stripeService.updateCardholder(updateUserDto.id, updateUserDto);
        const updatedUser = await this.userModel
            .findByIdAndUpdate(updateUserDto.id, { ...cardholder }, { new: true })
            .exec();
        if (!updatedUser)
            throw new common_1.NotFoundException({ error: 'User not found' });
        return updatedUser;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        stripe_service_1.StripeService])
], UserService);
//# sourceMappingURL=user.service.js.map