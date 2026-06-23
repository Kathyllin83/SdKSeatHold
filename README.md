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
    onReady: (eventId) => {
      console.log('Map ready for event:', eventId);
    },
    onSelectionChanged: (seatIds, ticketTypes) => {
      console.log('Selected seats:', seatIds);
      console.log('Ticket types chosen:', ticketTypes);
    },
    onHoldCreated: (holdId, expiresAt, seatIds, ticketTypes) => {
      console.log('Hold created:', holdId);
    },
  }).render();
</script>
```

## Multiprice

Pass `pricing` to define ticket types per category. When the user clicks a seat in that category, a popover shows the available ticket types to choose from.

```js
const chart = new SeatingChart({
  divId: 'seat-map',
  baseUrl: 'https://tickets.myapp.com',
  workspaceKey: 'pub_xxxxxxxxxxxx',
  event: 'my-event-slug',

  pricing: [
    {
      category: 'pista',
      ticketTypes: [
        { id: 'pista-inteira', label: 'Inteira',  price: 120, currency: 'BRL' },
        { id: 'pista-meia',    label: 'Meia',     price: 60,  currency: 'BRL', color: '#22c55e' },
      ],
    },
    {
      category: 'vip',
      ticketTypes: [
        { id: 'vip-inteira', label: 'VIP Inteira', price: 350, currency: 'BRL' },
      ],
    },
  ],

  onSelectionChanged: (seatIds, ticketTypes) => {
    // ticketTypes: { "seat-42": "pista-inteira", "seat-43": "pista-meia" }
    console.log(seatIds, ticketTypes);
  },

  onHoldCreated: (holdId, expiresAt, seatIds, ticketTypes) => {
    // Send holdId + ticketTypes to your backend to finalize the order
    fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ holdId, ticketTypes }),
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
| `sessionToken` | `string` | | Session token for authenticated holds |
| `pricing` | `PricingRule[]` | | Multiprice rules per category |
| `height` | `number or string` | | iframe height (default: `600px`) |
| `width` | `number or string` | | iframe width (default: `100%`) |
| `onReady` | `(eventId) => void` | | Fired when the map finishes loading |
| `onSelectionChanged` | `(seatIds, ticketTypes) => void` | | Fired on every selection change |
| `onObjectClicked` | `(objectId, objectType) => void` | | Fired when any object is clicked |
| `onCategoryChanged` | `(categoryId) => void` | | Fired when active category changes |
| `onViewChanged` | `(zoom, position) => void` | | Fired on pan/zoom |
| `onHoldCreated` | `(holdId, expiresAt, seatIds, ticketTypes) => void` | | Fired after a hold is created |
| `onHoldReleased` | `() => void` | | Fired after a hold is released |
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
