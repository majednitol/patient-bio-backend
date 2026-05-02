/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/inferschematype" />
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Model } from 'mongoose';
import { LoginUserDto } from 'src/dtos/login-user';
import { User } from 'src/schemas/user';
import { StripeService } from 'src/stripe/stripe.service';
export declare class AuthService {
    private userModel;
    private stripeService;
    private jwtService;
    constructor(userModel: Model<User>, stripeService: StripeService, jwtService: JwtService);
    generateNonce(wallet: string): Promise<any>;
    login(loginDto: LoginUserDto): Promise<any>;
    extractTokenFromHeader(request: Request): string | undefined;
}
