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
import { Model } from 'mongoose';
import { CreateCardDto } from 'src/dtos/create-card';
import { UpdateCardStatusDto } from 'src/dtos/update-card-status';
import { Card } from 'src/schemas/card';
import { StripeService } from 'src/stripe/stripe.service';
export declare class CardService {
    private cardModel;
    private stripeService;
    constructor(cardModel: Model<Card>, stripeService: StripeService);
    getAll(cardholderId: string): Promise<Card[]>;
    getById(id: string): Promise<Card>;
    createCard(cardholderId: string, createCardDto: CreateCardDto): Promise<Card>;
    updateCardStatus(cardholderId: string, updateCardStatusDto: UpdateCardStatusDto): Promise<Card>;
    updateCardLimits(cardholderId: string, updateCardLimitsDto: any): Promise<Card>;
}
