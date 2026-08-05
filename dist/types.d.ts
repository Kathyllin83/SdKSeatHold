export type TicketType = {
    id: string;
    label: string;
    color?: string | null;
    price?: number | null;
    currency?: string | null;
};
export type ReservaAquiEnvironment = 'production' | 'sandbox';
export type SessionTokenResponse = {
    session_token: string;
    expires_at: string;
};
export type InventoryStatusResponse = {
    label: string;
    status: 'available' | 'held' | string;
    created?: boolean;
};
export type ReservaAquiApiErrorCode = 'workspace_key_required' | 'invalid_workspace_key' | 'session_token_required' | 'invalid_or_expired_session_token' | 'session_token_event_mismatch' | 'session_token_workspace_mismatch';
export type ReservaAquiApiError = Error & {
    code?: ReservaAquiApiErrorCode | string;
    status?: number;
    payload?: unknown;
};
export type PricingRule = {
    /** Section key as exposed by the embed payload (`sections[].key`) */
    category: string;
    ticketTypes: TicketType[];
};
export type SectionSummary = {
    id: string;
    label: string;
    color?: string | null;
    /** Stable commercial key from the embed payload */
    key: string;
};
export type SelectedItem = {
    /** Stable commercial key (object_key from MapBuilder) */
    objectKey: string;
    /** Legacy UUID — use objectKey as primary reference */
    objectId: string | number;
    /** Stable section key from the inventory/map payload */
    sectionKey?: string | null;
    /** Stable category key from the inventory/map payload */
    categoryKey?: string | null;
    ticketType: string | null;
};
export type SessionState = {
    eventId: string;
    selectedSeatIds: Array<string | number>;
    /** Since the session-token refactor, `holdId` mirrors the session token value. */
    holdId: number | string | null;
    /** Since the session-token refactor, `holdToken` mirrors the session token value. */
    holdToken: string | null;
    sessionToken: string | null;
    sessionExpiresAt: string | null;
    expiresAt: string | null;
};
export type IncomingMessage = {
    type: 'reserva-aqui:set_selected_seats';
    seatIds: Array<string | number>;
} | {
    type: 'reserva-aqui:hold_created';
    holdId: string;
    holdToken: string;
    sessionToken: string;
    expiresAt: string | null;
} | {
    type: 'reserva-aqui:release_hold';
} | {
    type: 'reserva-aqui:update_session';
    sessionToken: string;
    expiresAt?: string | null;
} | {
    type: 'reserva-aqui:request_state';
} | {
    type: 'reserva-aqui:set_pricing';
    pricing: PricingRule[];
};
export type OutgoingMessage = {
    type: 'reserva-aqui:ready';
    eventId: string;
    objectKeys?: string[];
    sections?: SectionSummary[];
} | {
    type: 'reserva-aqui:selection_changed';
    seatIds: Array<string | number>;
    objectKeys: string[];
    items: SelectedItem[];
    ticketTypes: Record<string, string | null>;
    pricingSelection: Record<string, string | null>;
} | {
    type: 'reserva-aqui:object_clicked';
    objectId: number | string;
    objectKey?: string;
    objectType: string;
    categoryKey?: string | null;
} | {
    type: 'reserva-aqui:category_changed';
    categoryKey: string | null;
} | {
    type: 'reserva-aqui:view_changed';
    zoom: number;
    position: {
        x: number;
        y: number;
    };
} | {
    type: 'reserva-aqui:hold_created';
    holdId: number | string;
    holdToken: string | null;
    expiresAt: string | null;
    seatIds: Array<string | number>;
    objectKeys?: string[];
    items?: SelectedItem[];
    ticketTypes: Record<string, string | null>;
} | {
    type: 'reserva-aqui:hold_released';
} | {
    type: 'reserva-aqui:state';
    eventId: string;
    selectedSeatIds: Array<string | number>;
    holdId: number | string | null;
    holdToken: string | null;
    sessionToken?: string | null;
    sessionExpiresAt?: string | null;
    expiresAt: string | null;
} | {
    type: 'reserva-aqui:session_created';
    sessionToken: string;
    expiresAt: string;
} | {
    type: 'reserva-aqui:session_updated';
    sessionToken: string | null;
    expiresAt: string | null;
} | {
    type: 'reserva-aqui:error';
    action: string;
    message: string;
};
export type SeatingChartConfig = {
    /** DOM element ID where the iframe will be injected */
    divId: string;
    /** Your public workspace key */
    workspaceKey: string;
    /** Public event ID used in X-ReservaAqui-Event-Id */
    event: string;
    /** Base URL of your ReservaAqui server (e.g. https://tickets.myapp.com) */
    baseUrl: string;
    /** Embed mode applied at mount time */
    mode?: 'manager' | 'simplified';
    /** Optional backend environment for session creation */
    environment?: ReservaAquiEnvironment;
    /** Optional session token for authenticated holds */
    sessionToken?: string;
    /** Optional session expiration for SDK-managed refresh */
    sessionExpiresAt?: string | null;
    /** Milliseconds before expiration when the SDK should recreate the session */
    sessionRefreshBufferMs?: number;
    /** Multiprice rules: define ticket types per category key */
    pricing?: PricingRule[];
    /** iframe height (default: 600px) */
    height?: number | string;
    /** iframe width (default: 100%) */
    width?: number | string;
    onReady?: (eventId: string, objectKeys?: string[]) => void;
    onSelectionChanged?: (seatIds: Array<string | number>, ticketTypes: Record<string, string | null>, objectKeys: string[], items: SelectedItem[], pricingSelection: Record<string, string | null>) => void;
    onObjectClicked?: (objectId: number | string, objectType: string, objectKey?: string, categoryKey?: string | null) => void;
    onCategoryChanged?: (categoryKey: string | null) => void;
    onViewChanged?: (zoom: number, position: {
        x: number;
        y: number;
    }) => void;
    /** Since the session-token refactor, `holdId` and `holdToken` both mirror `sessionToken`. */
    onHoldCreated?: (holdId: number | string, holdToken: string | null, expiresAt: string | null, seatIds: Array<string | number>, ticketTypes: Record<string, string | null>, objectKeys: string[], items: SelectedItem[]) => void;
    onHoldReleased?: () => void;
    onState?: (state: SessionState) => void;
    onSessionCreated?: (sessionToken: string, expiresAt: string) => void;
    onSessionUpdated?: (sessionToken: string | null, expiresAt: string | null) => void;
    onError?: (action: string, message: string) => void;
};
