# @seathold/sdk

SDK para embedar o mapa de assentos SeatHold em qualquer página web.

```bash
npm install @seathold/sdk
```

Via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@seathold/sdk/dist/seathold.umd.js"></script>
```

---

## Guia de integração

### Pré-requisitos — o que você precisa ter em mãos

| Dado | O que é | Exemplo |
|---|---|---|
| `workspaceKey` | Chave pública do workspace | `pub_abc123` |
| `event` | **ID numérico** do evento na tabela `events` | `"42"` |
| `baseUrl` | URL base do seu servidor SeatHold | `https://tickets.myapp.com` |

> **Atenção:** `event` deve ser o ID numérico (`42`), não um slug (`"meu-show"`) nem um UUID. Se passar errado, o backend rejeita todas as requisições com 4xx.

---

### Passo 1 — Renderizar o mapa

```html
<div id="seat-map"></div>

<script type="module">
import { SeatingChart } from '@seathold/sdk';

const chart = new SeatingChart({
  divId:        'seat-map',
  baseUrl:      'https://tickets.myapp.com',
  workspaceKey: 'pub_abc123',
  event:        '42',           // ID numérico do evento
  mode:         'simplified',   // ou 'manager'

  onReady(eventId, objectKeys) {
    console.log('Mapa pronto', eventId);
  },

  onSelectionChanged(seatIds, ticketTypes, objectKeys, items, pricingSelection) {
    console.log('Seleção atual:', seatIds);
  },

  onError(action, message) {
    console.error('Erro SeatHold:', action, message);
  },
}).render();
</script>
```

---

### Passo 2 — Criar session token (obrigatório antes de qualquer hold)

O SDK cria e gerencia o token automaticamente. Basta chamar antes de fazer o hold:

```js
// O SDK verifica se o token ainda é válido; recria se estiver perto de expirar.
const { session_token, expires_at } = await chart.ensureValidSession();
```

Ou se quiser criar explicitamente na primeira vez:

```js
const { session_token, expires_at } = await chart.createSessionToken();
```

O SDK salva o token internamente e o renova automaticamente antes de expirar. Você **não precisa** gerenciar o timer manualmente.

---

### Passo 3 — Fazer hold por label

```js
// label é o campo "label" do inventário (ex: "A-1", "Mesa 3")
// NÃO é o objectId do builder
const result = await chart.holdByLabel('A-1');
// result: { label: 'A-1', status: 'held', created: true }
```

Para liberar:

```js
await chart.releaseByLabel('A-1');
```

> **Como obter o label correto?** Chame `getInventory()` e use o campo `label` de cada item:

```js
const inventory = await chart.getInventory();
// inventory.items[n].label  ← use este valor no holdByLabel()
```

---

### Passo 4 — Receber o evento de hold criado

Quando o mapa interno cria um hold, o SDK dispara `onHoldCreated`:

```js
const chart = new SeatingChart({
  // ...
  onHoldCreated(holdId, holdToken, expiresAt, seatIds, ticketTypes, objectKeys, items) {
    // holdId === holdToken === sessionToken (após o refactor de session-token)
    // Envie para o seu backend finalizar o pedido
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: holdId, seatIds, ticketTypes }),
    });
  },
}).render();
```

---

### Fluxo completo em código

```js
import { SeatingChart } from '@seathold/sdk';

const chart = new SeatingChart({
  divId:        'seat-map',
  baseUrl:      'https://tickets.myapp.com',
  workspaceKey: 'pub_abc123',
  event:        '42',

  onReady: () => console.log('Mapa pronto'),
  onError: (action, msg) => console.error(action, msg),
}).render();

// Quando o usuário clicar em "Reservar":
async function reservar(label) {
  try {
    await chart.ensureValidSession();          // 1. garante token válido
    const result = await chart.holdByLabel(label); // 2. faz o hold
    console.log('Hold criado:', result);
  } catch (err) {
    console.error('Falha no hold:', err.status, err.code, err.message);
  }
}
```

---

## Headers enviados automaticamente

O SDK injeta esses headers em **todas** as requisições protegidas:

| Header | Valor |
|---|---|
| `X-SeatHold-Event-Id` | `config.event` (ID numérico) |
| `X-SeatHold-Public-Key` | `config.workspaceKey` |
| `X-SeatHold-Session-Token` | token criado em `/api/session-tokens` |

Todas as requisições também enviam `credentials: 'include'` para suportar cookies CSRF em ambientes browser.

---

## Erros comuns e o que fazer

| Status | Código | Causa | Solução |
|---|---|---|---|
| 4xx | — | `event` não é numérico | Usar o ID numérico do evento, não slug |
| 401/403 | `invalid_or_expired_session_token` | Token expirou | Chamar `ensureValidSession()` antes do hold — o SDK renova automaticamente |
| 404 | — | Label errado no path | Confirmar que o label vem de `getInventory()`, não do objectId do builder |
| 419 | — | Cookie CSRF ausente | SDK já envia `credentials: 'include'` desde a v0.1.17 |
| 4xx | `workspace_key_required` | Header público ausente | Verificar que `workspaceKey` está correto |

---

## Multiprice (opcional)

```js
const chart = new SeatingChart({
  divId: 'seat-map',
  baseUrl: 'https://tickets.myapp.com',
  workspaceKey: 'pub_abc123',
  event: '42',

  pricing: [
    {
      category: 'pista',   // deve bater com sections[].key do embed
      ticketTypes: [
        { id: 'inteira', label: 'Inteira', price: 120, currency: 'BRL' },
        { id: 'meia',    label: 'Meia',    price: 60,  currency: 'BRL' },
      ],
    },
  ],

  onSelectionChanged(seatIds, ticketTypes, objectKeys, items, pricingSelection) {
    // ticketTypes: { "seat-42": "inteira" }
    // pricingSelection: { "seat-42": "inteira" }
  },
}).render();
```

O `category` em `pricing` deve ser exatamente o `key` que aparece em `sections[]` no evento `onReady` ou `getBuilder()`.

---

## Captura de session token do iframe

Se o próprio embed criar a sessão internamente (modo padrão sem `createSessionToken()` explícito):

```js
const chart = new SeatingChart({
  // ...
  onSessionCreated(sessionToken, expiresAt) {
    // primeira sessão criada pelo iframe
    salvarNoBackend(sessionToken, expiresAt);
  },
  onSessionUpdated(sessionToken, expiresAt) {
    // sessão renovada pelo iframe
    salvarNoBackend(sessionToken, expiresAt);
  },
}).render();
```

---

## Referência rápida de métodos

```js
chart.render()                         // monta o iframe
chart.destroy()                        // remove o iframe e listeners

await chart.createSessionToken()       // POST /api/session-tokens (primeira vez)
await chart.refreshSessionToken()      // força renovação imediata
await chart.ensureValidSession()       // reusa ou renova se próximo de expirar

await chart.getBuilder()               // GET /api/render-map/builder
await chart.getInventory()             // GET /api/render-map/inventory
await chart.holdByLabel('A-1')         // POST /api/inventory/A-1/hold
await chart.releaseByLabel('A-1')      // POST /api/inventory/A-1/release

chart.setSelectedSeats([1, 2, 3])      // seleciona assentos programaticamente
chart.holdCreated(token, expiresAt)    // notifica o iframe de um hold externo
chart.releaseHold()                    // libera o hold atual no iframe
chart.updateSession(token, expiresAt)  // atualiza token no iframe
chart.requestState()                   // solicita snapshot do estado atual
chart.setPricing(rules)                // atualiza pricing em tempo real
```

---

## Referência de tipos

```ts
type SeatingChartConfig = {
  divId: string;
  baseUrl: string;
  workspaceKey: string;
  event: string;                        // ID numérico como string
  mode?: 'manager' | 'simplified';
  environment?: 'production' | 'sandbox';
  sessionToken?: string;
  sessionExpiresAt?: string | null;
  sessionRefreshBufferMs?: number;      // padrão: 30000ms
  pricing?: PricingRule[];
  height?: number | string;             // padrão: 600px
  width?: number | string;              // padrão: 100%
  onReady?: (eventId: string, objectKeys?: string[]) => void;
  onSelectionChanged?: (seatIds, ticketTypes, objectKeys, items, pricingSelection) => void;
  onObjectClicked?: (objectId, objectType, objectKey?, categoryKey?) => void;
  onCategoryChanged?: (categoryKey: string | null) => void;
  onViewChanged?: (zoom: number, position: { x: number; y: number }) => void;
  onHoldCreated?: (holdId, holdToken, expiresAt, seatIds, ticketTypes, objectKeys, items) => void;
  onHoldReleased?: () => void;
  onState?: (state: SessionState) => void;
  onSessionCreated?: (sessionToken: string, expiresAt: string) => void;
  onSessionUpdated?: (sessionToken: string | null, expiresAt: number | null) => void;
  onError?: (action: string, message: string) => void;
};

type PricingRule = {
  category: string;       // deve bater com sections[].key
  ticketTypes: TicketType[];
};

type TicketType = {
  id: string;
  label: string;
  color?: string | null;
  price?: number | null;
  currency?: string | null;
};

type InventoryStatusResponse = {
  label: string;
  status: 'available' | 'held' | string;
  created?: boolean;
};

type SessionTokenResponse = {
  session_token: string;
  expires_at: string;
};
```
