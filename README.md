# SeatHold SDK

Embed an interactive seat map in any web page.

## Installation

```bash
npm install @seathold/sdk
```

Or via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@seathold/sdk/dist/seathold.umd.js"></script>
```

## Basic Usage

```html
<div id="seat-map"></div>

<script type="module">
  import { SeatingChart } from '@seathold/sdk';

  const chart = new SeatingChart({
    divId: 'seat-map',
    baseUrl: 'https://tickets.myapp.com',
    workspaceKey: 'pub_xxxxxxxxxxxx',
    event: 'my-event-slug',
    mode: 'simplified',
    onReady: (eventId, objectKeys) => {
      console.log('Map ready for event:', eventId, objectKeys);
    },
    onSelectionChanged: (seatIds, ticketTypes, objectKeys, items, pricingSelection) => {
      console.log('Selected seats:', seatIds);
      console.log('Ticket types chosen:', ticketTypes);
      console.log('Pricing selection:', pricingSelection);
      console.log('Selected items:', items);
    },
    onSessionCreated: (sessionToken, expiresAt) => {
      console.log('Embed session created:', sessionToken, expiresAt);
    },
    onSessionUpdated: (sessionToken, expiresAt) => {
      console.log('Embed session token:', sessionToken, 'expires at:', expiresAt);
    },
    onHoldCreated: (holdId, holdToken, expiresAt, seatIds, ticketTypes) => {
      console.log('Hold created:', holdId);
    },
  }).render();
</script>
```

## Multiprice

Pass `pricing` to define ticket types per section key. `pricing[].category` must match the key exposed by the embed payload, for example `sections[].key`. When the user clicks a seat in that section, a popover shows the available ticket types to choose from.

```js
const chart = new SeatingChart({
  divId: 'seat-map',
  baseUrl: 'https://tickets.myapp.com',
  workspaceKey: 'pub_xxxxxxxxxxxx',
  event: 'my-event-slug',

  pricing: [
    {
      category: '1b',
      ticketTypes: [
        { id: 'pista-inteira', label: 'Inteira',  price: 120, currency: 'BRL' },
        { id: 'pista-meia',    label: 'Meia',     price: 60,  currency: 'BRL', color: '#22c55e' },
      ],
    },
    {
      category: 'vip-a',
      ticketTypes: [
        { id: 'vip-inteira', label: 'VIP Inteira', price: 350, currency: 'BRL' },
      ],
    },
  ],

  onSelectionChanged: (seatIds, ticketTypes, objectKeys, items, pricingSelection) => {
    // ticketTypes: { "seat-42": "pista-inteira", "seat-43": "pista-meia" }
    console.log(seatIds, ticketTypes, objectKeys, items, pricingSelection);
  },

  onSessionCreated: (sessionToken, expiresAt) => {
    // Persist the first session token created inside the iframe
    fetch('/api/embed-session-created', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, expiresAt }),
    });
  },

  onSessionUpdated: (sessionToken, expiresAt) => {
    // Persist the new embed session token created inside the iframe
    fetch('/api/embed-session', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, expiresAt }),
    });
  },

  onHoldCreated: (holdId, holdToken, expiresAt, seatIds, ticketTypes) => {
    // Since the session-token refactor, holdId === holdToken === sessionToken
    // Send the session token to your backend to finalize the order
    fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ holdId, holdToken, ticketTypes }),
    });
  },
}).render();
```

## API

### `new SeatingChart(config)`

| Option | Type | Required | Description |
|---|---|---|---|
| `divId` | `string` | yes | ID of the container element |
| `baseUrl` | `string` | yes | Base URL of your SeatHold server |
| `workspaceKey` | `string` | yes | Public workspace key |
| `event` | `string` | yes | Event slug or ID |
| `mode` | `'manager' \| 'simplified'` | | Embed mode applied on iframe mount |
| `sessionToken` | `string` | | Session token for authenticated holds |
| `pricing` | `PricingRule[]` | | Multiprice rules per section key |
| `height` | `number or string` | | iframe height (default: `600px`) |
| `width` | `number or string` | | iframe width (default: `100%`) |
| `onReady` | `(eventId, objectKeys?) => void` | | Fired when the map finishes loading |
| `onSelectionChanged` | `(seatIds, ticketTypes, objectKeys, items, pricingSelection) => void` | | Fired on every selection change |
| `onObjectClicked` | `(objectId, objectType, objectKey?, categoryKey?) => void` | | Fired when any object is clicked |
| `onCategoryChanged` | `(categoryId) => void` | | Fired when active category changes |
| `onViewChanged` | `(zoom, position) => void` | | Fired on pan/zoom |
| `onHoldCreated` | `(holdId, holdToken, expiresAt, seatIds, ticketTypes, objectKeys, items) => void` | | Fired after a hold is created |
| `onHoldReleased` | `() => void` | | Fired after a hold is released |
| `onState` | `(state) => void` | | Fired when the iframe responds to `requestState()` |
| `onSessionCreated` | `(sessionToken, expiresAt) => void` | | Fired when the iframe creates a new session |
| `onSessionUpdated` | `(sessionToken, expiresAt) => void` | | Fired when the iframe creates or refreshes the embed session token |
| `onError` | `(action, message) => void` | | Fired on errors |

### Instance methods

```js
chart.render()                        // Inject the iframe and start listening
chart.destroy()                       // Remove the iframe and all listeners
chart.setSelectedSeats([id1, id2])    // Programmatically select seats
chart.createHold([id1, id2])          // Trigger a hold (optional seat list)
chart.releaseHold()                   // Release the current hold
chart.updateSession(token, expiresAt) // Refresh the session token
chart.requestState()                  // Ask for current state snapshot
chart.setPricing(rules)               // Update pricing rules at runtime
```

## Embed mode

Set `mode` only when creating the chart. The SDK sends it as a query param in the iframe URL, for example `?mode=simplified` or `?mode=manager`.

If `mode` is omitted, the embed uses the default purchase flow. To change mode after load, destroy and render a new iframe with a different `mode`.

## Session token capture

If the embed creates a new authenticated session from inside the iframe, listen to `onSessionCreated` and `onSessionUpdated` to capture the `sessionToken` in the host app:

```js
const chart = new SeatingChart({
  // ...
  onSessionCreated: (sessionToken, expiresAt) => {
    console.log('New sessionToken from iframe:', sessionToken, expiresAt);
  },
  onSessionUpdated: (sessionToken, expiresAt) => {
    console.log('Updated sessionToken from iframe:', sessionToken, expiresAt);
  },
  onState: (state) => {
    console.log('Current embed state:', state);
  },
}).render();

chart.requestState();
```

For this to work, the embed must post either:

- `seathold:session_created` with `{ sessionToken, expiresAt }`
- `seathold:session_updated` with `{ sessionToken, expiresAt }`
- `seathold:state` with `{ sessionToken, sessionExpiresAt, ... }`

## Hold token compatibility

Since the session-token refactor, `holdId === holdToken === sessionToken`.

If your booking API previously received `holdId`, update that integration to use the `sessionToken` semantics instead. The TypeScript types still allow the legacy names for backward compatibility.

## Selection payload

The embed can now expose stable commercial keys directly in the selection payload.

```ts
type SelectedItem = {
  objectKey: string;
  objectId: string | number;
  sectionKey?: string | null;
  categoryKey?: string | null;
  ticketType: string | null;
};
```

`items` in `onSelectionChanged` and `onHoldCreated` may include `sectionKey` and `categoryKey` when the map or inventory payload provides them.

`onSelectionChanged` now also receives:

```ts
pricingSelection: Record<string, string | null>;
```

This maps each selected object to the current pricing choice coming from the embed.

## TicketType

```ts
type TicketType = {
  id: string;
  label: string;
  color?: string | null;
  price?: number | null;
  currency?: string | null;
};
```
