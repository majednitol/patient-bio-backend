import { RawBodyRequest } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Request, Response } from 'express';
export declare class TransactionController {
    private readonly transactionService;
    constructor(transactionService: TransactionService);
    getAll(): Promise<import("../schemas/transaction").Transaction[]>;
    getById(id: string): Promise<import("../schemas/transaction").Transaction>;
    handleWebhook(req: RawBodyRequest<Request>, signature: string, response: Response): Promise<void>;
}
