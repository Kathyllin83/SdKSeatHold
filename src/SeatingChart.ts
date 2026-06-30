import type {
  IncomingMessage,
  InventoryStatusResponse,
  OutgoingMessage,
  PricingRule,
  SeatHoldApiError,
  SeatingChartConfig,
  SectionSummary,
  SessionTokenResponse,
} from './types';

export class SeatingChart {
  private readonly config: SeatingChartConfig;
  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private iframeOrigin: string = '';
  private sessionToken: string | null;
  private sessionExpiresAt: string | null;
  private sessionRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: SeatingChartConfig) {
    this.config = config;
    this.sessionToken = config.sessionToken ?? null;
    this.sessionExpiresAt = config.sessionExpiresAt ?? null;
    if (!/^\d+$/.test(config.event)) {
      console.warn(`[SeatHold] config.event "${config.event}" does not look like a numeric event ID. X-SeatHold-Event-Id must be the numeric database ID of the event, not a slug or UUID.`);
    }
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
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
      this.sessionRefreshTimer = null;
    }
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
  }

  setSelectedSeats(seatIds: Array<string | number>): void {
    this.send({ type: 'seathold:set_selected_seats', seatIds });
  }

  holdCreated(sessionToken: string, expiresAt: number | null): void {
    this.send({
      type: 'seathold:hold_created',
      holdId: sessionToken,
      holdToken: sessionToken,
      sessionToken,
      expiresAt,
    });
  }

  releaseHold(): void {
    this.send({ type: 'seathold:release_hold' });
  }

  updateSession(sessionToken: string, expiresAt?: number | null): void {
    this.sessionToken = sessionToken;
    if (expiresAt != null) {
      this.sessionExpiresAt = new Date(expiresAt).toISOString();
      this.scheduleSessionRefresh();
    }
    this.send({ type: 'seathold:update_session', sessionToken, expiresAt });
  }

  requestState(): void {
    this.send({ type: 'seathold:request_state' });
  }

  setPricing(pricing: PricingRule[]): void {
    this.send({ type: 'seathold:set_pricing', pricing });
  }

  async createSessionToken(): Promise<SessionTokenResponse> {
    return this.requestSessionToken('created');
  }

  async refreshSessionToken(): Promise<SessionTokenResponse> {
    return this.requestSessionToken('updated');
  }

  private async requestSessionToken(trigger: 'created' | 'updated'): Promise<SessionTokenResponse> {
    const response = await fetch(`${this.getApiBaseUrl()}/api/session-tokens`, {
      method: 'POST',
      credentials: 'include',
      headers: this.buildHeaders(false, undefined, true),
    });
    const payload = await this.parseJson<SessionTokenResponse>(response);
    if (!response.ok) {
      throw this.createApiError('createSessionToken', response.status, payload);
    }

    this.sessionToken = payload.session_token;
    this.sessionExpiresAt = payload.expires_at;
    this.scheduleSessionRefresh();
    this.syncIframeSession(payload.session_token, payload.expires_at);
    if (trigger === 'created') {
      this.config.onSessionCreated?.(payload.session_token, payload.expires_at);
    } else {
      this.config.onSessionUpdated?.(payload.session_token, Date.parse(payload.expires_at));
    }
    return payload;
  }

  async ensureValidSession(): Promise<SessionTokenResponse> {
    if (!this.sessionToken || this.isSessionNearExpiry()) {
      return this.requestSessionToken(this.sessionToken ? 'updated' : 'created');
    }

    return {
      session_token: this.sessionToken,
      expires_at: this.sessionExpiresAt ?? new Date(0).toISOString(),
    };
  }

  async getBuilder<T = unknown>(): Promise<T> {
    await this.ensureValidSession();
    return this.getProtectedJson<T>('/api/render-map/builder');
  }

  async getInventory<T = unknown>(): Promise<T> {
    await this.ensureValidSession();
    return this.getProtectedJson<T>('/api/render-map/inventory');
  }

  async holdByLabel(label: string): Promise<InventoryStatusResponse> {
    await this.ensureValidSession();
    return this.postProtectedJson<InventoryStatusResponse>(`/api/inventory/${encodeURIComponent(label)}/hold`);
  }

  async releaseByLabel(label: string): Promise<InventoryStatusResponse> {
    await this.ensureValidSession();
    return this.postProtectedJson<InventoryStatusResponse>(`/api/inventory/${encodeURIComponent(label)}/release`);
  }

  private validateAndSetPricing(pricing: PricingRule[], sections?: SectionSummary[], fallbackKeys?: string[]): void {
    const validKeys = sections?.map((section) => section.key).filter(Boolean) ?? fallbackKeys ?? [];
    if (validKeys.length > 0) {
      for (const rule of pricing) {
        if (!validKeys.includes(rule.category)) {
          console.warn(`[SeatHold] Pricing category "${rule.category}" has no matching section key in the embed payload — it will have no effect.`);
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
        const readyKeys = data.sections?.map((section) => section.key) ?? data.objectKeys;
        if (readyKeys) {
          for (const key of readyKeys) {
            if (!key) {
              console.warn('[SeatHold] A bookable section has no key — it will not be commercially addressable.');
            }
          }
        }
        if (this.config.pricing && this.config.pricing.length > 0) {
          this.validateAndSetPricing(this.config.pricing, data.sections, data.objectKeys);
        }
        this.config.onReady?.(data.eventId, data.objectKeys);
        break;

      case 'seathold:selection_changed':
        this.config.onSelectionChanged?.(data.seatIds, data.ticketTypes, data.objectKeys, data.items, data.pricingSelection);
        break;

      case 'seathold:object_clicked':
        this.config.onObjectClicked?.(data.objectId, data.objectType, data.objectKey, data.categoryKey);
        break;

      case 'seathold:category_changed':
        this.config.onCategoryChanged?.(data.categoryKey);
        break;

      case 'seathold:view_changed':
        this.config.onViewChanged?.(data.zoom, data.position);
        break;

      case 'seathold:hold_created':
        this.config.onHoldCreated?.(data.holdId, data.holdToken, data.expiresAt, data.seatIds, data.ticketTypes, data.objectKeys ?? [], data.items ?? []);
        break;

      case 'seathold:hold_released':
        this.config.onHoldReleased?.();
        break;

      case 'seathold:state':
        this.config.onState?.({
          eventId: data.eventId,
          selectedSeatIds: data.selectedSeatIds,
          holdId: data.holdId,
          holdToken: data.holdToken,
          sessionToken: data.sessionToken ?? null,
          sessionExpiresAt: data.sessionExpiresAt ?? data.expiresAt,
          expiresAt: data.expiresAt,
        });
        break;

      case 'seathold:session_created':
        this.sessionToken = data.sessionToken;
        this.sessionExpiresAt = data.expiresAt;
        this.scheduleSessionRefresh();
        this.config.onSessionCreated?.(data.sessionToken, data.expiresAt);
        break;

      case 'seathold:session_updated':
        this.sessionToken = data.sessionToken;
        this.sessionExpiresAt = data.expiresAt != null ? new Date(data.expiresAt).toISOString() : null;
        this.scheduleSessionRefresh();
        this.config.onSessionUpdated?.(data.sessionToken, data.expiresAt);
        break;

      case 'seathold:error':
        this.config.onError?.(data.action, data.message);
        break;
    }
  }

  private buildEmbedUrl(): string {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const params = new URLSearchParams({
      event_id: this.config.event,
      workspace_key: this.config.workspaceKey,
      ...(this.sessionToken ? { session_token: this.sessionToken } : {}),
      ...(this.config.mode ? { mode: this.config.mode } : {}),
    });
    return `${base}/embed/render?${params.toString()}`;
  }

  private getApiBaseUrl(): string {
    return this.config.baseUrl.replace(/\/$/, '');
  }

  private buildHeaders(includeSessionToken: boolean, sessionToken?: string, includeEnvironment: boolean = false): HeadersInit {
    const headers: Record<string, string> = {
      'X-SeatHold-Event-Id': this.config.event,
      'X-SeatHold-Public-Key': this.config.workspaceKey,
    };

    if (includeSessionToken) {
      const resolvedSessionToken = sessionToken ?? this.sessionToken;
      if (!resolvedSessionToken) {
        throw this.createApiError('missingSessionToken', 400, { code: 'session_token_required' });
      }
      headers['X-SeatHold-Session-Token'] = resolvedSessionToken;
    }

    if (includeEnvironment && this.config.environment) {
      headers['X-SeatHold-Environment'] = this.config.environment;
    }

    return headers;
  }

  private async getProtectedJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.getApiBaseUrl()}${path}`, {
      method: 'GET',
      credentials: 'include',
      headers: this.buildHeaders(true),
    });
    const payload = await this.parseJson<T>(response);
    if (!response.ok) {
      throw this.createApiError(path, response.status, payload);
    }
    return payload;
  }

  private async postProtectedJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.getApiBaseUrl()}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: this.buildHeaders(true),
    });
    const payload = await this.parseJson<T>(response);
    if (!response.ok) {
      throw this.createApiError(path, response.status, payload);
    }
    return payload;
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return { message: text } as T;
    }
  }

  private createApiError(action: string, status: number, payload: unknown): SeatHoldApiError {
    const payloadCode = typeof payload === 'object' && payload !== null && 'code' in payload ? String(payload.code) : undefined;
    const payloadMessage = typeof payload === 'object' && payload !== null && 'message' in payload ? String(payload.message) : undefined;
    const error = new Error(payloadMessage ?? `SeatHold API request failed for ${action}`) as SeatHoldApiError;
    error.code = payloadCode;
    error.status = status;
    error.payload = payload;
    this.config.onError?.(action, error.message);
    return error;
  }

  private isSessionNearExpiry(): boolean {
    if (!this.sessionExpiresAt) return false;
    const refreshBufferMs = this.config.sessionRefreshBufferMs ?? 30_000;
    return Date.parse(this.sessionExpiresAt) - Date.now() <= refreshBufferMs;
  }

  private scheduleSessionRefresh(): void {
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
      this.sessionRefreshTimer = null;
    }
    if (!this.sessionExpiresAt) return;

    const refreshBufferMs = this.config.sessionRefreshBufferMs ?? 30_000;
    const delay = Date.parse(this.sessionExpiresAt) - Date.now() - refreshBufferMs;
    if (delay <= 0) return;

    this.sessionRefreshTimer = setTimeout(async () => {
      try {
        await this.requestSessionToken('updated');
      } catch {
        // Errors are already surfaced through onError.
      }
    }, delay);
  }

  private syncIframeSession(sessionToken: string, expiresAt: string): void {
    const numericExpiresAt = Date.parse(expiresAt);
    if (!Number.isNaN(numericExpiresAt)) {
      this.send({ type: 'seathold:update_session', sessionToken, expiresAt: numericExpiresAt });
    }
  }

  private resolveSize(value: number | string | undefined, fallback: string): string {
    if (value == null) return fallback;
    return typeof value === 'number' ? `${value}px` : value;
  }
}
