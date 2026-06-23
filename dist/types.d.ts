export type TicketType = {
    id: string;
    label: string;
    color?: string | null;
    price?: number | null;
    currency?: string | null;
};
export type PricingRule = {
    category: string;
    ticketTypes: TicketType[];
};
export type IncomingMessage = {
    type: 'seathold:set_selected_seats';
    seatIds: Array<string | number>;
} | {
    type: 'seathold:create_hold';
    seatIds?: Array<string | number>;
} | {
    type: 'seathold:release_hold';
} | {
    type: 'seathold:update_session';
    sessionToken: string;
    expiresAt?: number | null;
} | {
    type: 'seathold:request_state';
} | {
    type: 'seathold:set_pricing';
    pricing: PricingRule[];
};
export type OutgoingMessage = {
    type: 'seathold:ready';
    eventId: string;
} | {
    type: 'seathold:selection_changed';
    seatIds: Array<string | number>;
    ticketTypes: Record<string, string | null>;
} | {
    type: 'seathold:object_clicked';
    objectId: number | string;
    objectType: string;
} | {
    type: 'seathold:category_changed';
    categoryId: string | number | null;
} | {
    type: 'seathold:view_changed';
    zoom: number;
    position: {
        x: number;
        y: number;
    };
} | {
    type: 'seathold:hold_created';
    holdId: number | string;
    expiresAt: number | null;
    seatIds: Array<string | number>;
    ticketTypes: Record<string, string | null>;
} | {
    type: 'seathold:hold_released';
} | {
    type: 'seathold:state';
    eventId: string;
    selectedSeatIds: Array<string | number>;
    holdId: number | string | null;
    holdToken: string | null;
    expiresAt: number | null;
} | {
    type: 'seathold:error';
    action: string;
    message: string;
};
export type SeatingChartConfig = {
    /** DOM element ID where the iframe will be injected */
    divId: string;
    /** Your public workspace key */
    workspaceKey: string;
    /** Event slug or ID */
    event: string;
    /** Base URL of your SeatHold server (e.g. https://tickets.myapp.com) */
    baseUrl: string;
    /** Optional session token for authenticated holds */
    sessionToken?: string;
    /** Multiprice rules: define ticket types per category key */
    pricing?: PricingRule[];
    /** iframe height (default: 600px) */
    height?: number | string;
    /** iframe width (default: 100%) */
    width?: number | string;
    onReady?: (eventId: string) => void;
    onSelectionChanged?: (seatIds: Array<string | number>, ticketTypes: Record<string, string | null>) => void;
    onObjectClicked?: (objectId: number | string, objectType: string) => void;
    onCategoryChanged?: (categoryId: string | number | null) => void;
    onViewChanged?: (zoom: number, position: {
        x: number;
        y: number;
    }) => void;
    onHoldCreated?: (holdId: number | string, expiresAt: number | null, seatIds: Array<string | number>, ticketTypes: Record<string, string | null>) => void;
    onHoldReleased?: () => void;
    onError?: (action: string, message: string) => void;
};
