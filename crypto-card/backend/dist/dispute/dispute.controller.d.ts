import { DisputeService } from './dispute.service';
export declare class DisputeController {
    private readonly disputeService;
    constructor(disputeService: DisputeService);
    getAll(): Promise<import("../schemas/dispute").Dispute[]>;
    getById(id: string): Promise<import("../schemas/dispute").Dispute>;
    createDispute(createDisputeDto: any): Promise<import("../schemas/dispute").Dispute>;
}
