import type { IncomingMessage, OutgoingMessage, PricingRule, SeatingChartConfig } from './types';

export class SeatingChart {
  private readonly config: SeatingChartConfig;
  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private iframeOrigin: string = '';

  constructor(config: SeatingChartConfig) {
    this.config = config;
  }

  render(): this {
    const container = document.getElementById(this.config.divId);
    if (!container) {
      throw new Error(`[SeatHold] Element #${this.config.divId} not found.`);
    }

    const url = this.buildEmbedUrl();
    this.iframeOrigin = new URL(this.config.baseUrl).origin;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = this.resolveSize(this.config.width, '100%');
    iframe.style.height = this.resolveSize(this.config.height, '600px');
    iframe.style.border = 'none';
    iframe.allow = 'fullscreen';
    this.iframe = iframe;

    container.innerHTML = '';
    container.appendChild(iframe);

    this.messageHandler = (event: MessageEvent<OutgoingMessage>) => {
      if (event.origin !== this.iframeOrigin) return;
      this.handleMessage(event.data);
    };
    window.addEventListener('message', this.messageHandler);

    return this;
  }

  destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
  }

  setSelectedSeats(seatIds: Array<string | number>): void {
    this.send({ type: 'seathold:set_selected_seats', seatIds });
  }

  createHold(seatIds?: Array<string | number>): void {
    this.send({ type: 'seathold:create_hold', seatIds });
  }

  releaseHold(): void {
    this.send({ type: 'seathold:release_hold' });
  }

  updateSession(sessionToken: string, expiresAt?: number | null): void {
    this.send({ type: 'seathold:update_session', sessionToken, expiresAt });
  }

  requestState(): void {
    this.send({ type: 'seathold:request_state' });
  }

  setPricing(pricing: PricingRule[]): void {
    this.send({ type: 'seathold:set_pricing', pricing });
  }

  private validateAndSetPricing(pricing: PricingRule[], objectKeys?: string[]): void {
    if (objectKeys && objectKeys.length > 0) {
      for (const rule of pricing) {
        if (!objectKeys.includes(rule.category)) {
          console.warn(`[SeatHold] Pricing category "${rule.category}" has no matching object_key in the map — it will have no effect.`);
        }
      }
    }
    this.setPricing(pricing);
  }

  private send(message: IncomingMessage): void {
    if (!this.iframe?.contentWindow) {
      console.warn('[SeatHold] iframe not ready yet.');
      return;
    }
    this.iframe.contentWindow.postMessage(message, this.iframeOrigin);
  }

  private handleMessage(data: OutgoingMessage): void {
    switch (data.type) {
      case 'seathold:ready':
        if (data.objectKeys) {
          for (const key of data.objectKeys) {
            if (!key) {
              console.warn('[SeatHold] A bookable object has no object_key — it will not be commercially addressable.');
            }
          }
        }
        if (this.config.pricing && this.config.pricing.length > 0) {
          this.validateAndSetPricing(this.config.pricing, data.objectKeys);
        }
        this.config.onReady?.(data.eventId);
        break;

      case 'seathold:selection_changed':
        this.config.onSelectionChanged?.(data.seatIds, data.ticketTypes, data.objectKeys, data.items);
        break;

      case 'seathold:object_clicked':
        this.config.onObjectClicked?.(data.objectId, data.objectType, data.objectKey);
        break;

      case 'seathold:category_changed':
        this.config.onCategoryChanged?.(data.categoryKey);
        break;

      case 'seathold:view_changed':
        this.config.onViewChanged?.(data.zoom, data.position);
        break;

      case 'seathold:hold_created':
        this.config.onHoldCreated?.(data.holdId, data.holdToken, data.expiresAt, data.seatIds, data.ticketTypes, data.objectKeys, data.items);
        break;

      case 'seathold:hold_released':
        this.config.onHoldReleased?.();
        break;

      case 'seathold:error':
        this.config.onError?.(data.action, data.message);
        break;
    }
  }

  private buildEmbedUrl(): string {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const params = new URLSearchParams({
      workspace_key: this.config.workspaceKey,
      ...(this.config.sessionToken ? { session_token: this.config.sessionToken } : {}),
    });
    return `${base}/embed/${this.config.event}?${params.toString()}`;
  }

  private resolveSize(value: number | string | undefined, fallback: string): string {
    if (value == null) return fallback;
    return typeof value === 'number' ? `${value}px` : value;
  }
}
