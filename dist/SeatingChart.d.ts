import type { PricingRule, SeatingChartConfig } from './types';
export declare class SeatingChart {
    private readonly config;
    private iframe;
    private messageHandler;
    private iframeOrigin;
    constructor(config: SeatingChartConfig);
    render(): this;
    destroy(): void;
    setSelectedSeats(seatIds: Array<string | number>): void;
    holdCreated(sessionToken: string, expiresAt: number | null): void;
    releaseHold(): void;
    updateSession(sessionToken: string, expiresAt?: number | null): void;
    requestState(): void;
    setPricing(pricing: PricingRule[]): void;
    private validateAndSetPricing;
    private send;
    private handleMessage;
    private buildEmbedUrl;
    private resolveSize;
}
