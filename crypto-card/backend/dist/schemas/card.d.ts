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
import { HydratedDocument } from 'mongoose';
export type CardDocument = HydratedDocument<Card>;
export declare class Card {
    cardId: string;
    cardholderId: string;
    type: string;
    currency: string;
    expMonth: number;
    expYear: number;
    last4: string;
    brand: string;
    status: string;
    limits?: {
        monthlyLimit?: number;
        singleTxLimit?: number;
    };
}
export declare const CardSchema: import("mongoose").Schema<Card, import("mongoose").Model<Card, any, any, any, import("mongoose").Document<unknown, any, Card> & Card & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Card, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Card>> & import("mongoose").FlatRecord<Card> & {
    _id: import("mongoose").Types.ObjectId;
}>;
