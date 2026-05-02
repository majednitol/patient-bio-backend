import { Request } from 'express';
import { CardService } from './card.service';
import { CreateCardDto } from 'src/dtos/create-card';
import { UpdateCardStatusDto } from 'src/dtos/update-card-status';
import { UpdateCardLimitsDto } from 'src/dtos/update-card-limits';
export declare class CardController {
    private readonly cardService;
    constructor(cardService: CardService);
    getAll(req: Request): Promise<import("../schemas/card").Card[]>;
    getById(id: string): Promise<import("../schemas/card").Card>;
    createCard(createCardDto: CreateCardDto, req: Request): Promise<import("../schemas/card").Card>;
    updateCardStatus(updateCardStatusDto: UpdateCardStatusDto, req: Request): Promise<import("../schemas/card").Card>;
    updateCardLimits(updateCardLimitsDto: UpdateCardLimitsDto, req: Request): Promise<import("../schemas/card").Card>;
}
