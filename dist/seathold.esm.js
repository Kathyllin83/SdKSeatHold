class _ {
  constructor(e) {
    this.iframe = null, this.messageHandler = null, this.iframeOrigin = "", this.sessionRefreshTimer = null, this.config = e, this.sessionToken = e.sessionToken ?? null, this.sessionExpiresAt = e.sessionExpiresAt ?? null, /^\d+$/.test(e.event) || console.warn(`[SeatHold] config.event "${e.event}" does not look like a numeric event ID. X-SeatHold-Event-Id must be the numeric database ID of the event, not a slug or UUID.`);
  }
  render() {
    const e = document.getElementById(this.config.divId);
    if (!e)
      throw new Error(`[SeatHold] Element #${this.config.divId} not found.`);
    const s = this.buildEmbedUrl();
    this.iframeOrigin = new URL(this.config.baseUrl).origin;
    const i = document.createElement("iframe");
    return i.src = s, i.style.width = this.resolveSize(this.config.width, "100%"), i.style.height = this.resolveSize(this.config.height, "600px"), i.style.border = "none", i.allow = "fullscreen", this.iframe = i, e.innerHTML = "", e.appendChild(i), this.messageHandler = (t) => {
      t.origin === this.iframeOrigin && this.handleMessage(t.data);
    }, window.addEventListener("message", this.messageHandler), this;
  }
  destroy() {
    this.messageHandler && (window.removeEventListener("message", this.messageHandler), this.messageHandler = null), this.sessionRefreshTimer && (clearTimeout(this.sessionRefreshTimer), this.sessionRefreshTimer = null), this.iframe && (this.iframe.remove(), this.iframe = null);
  }
  setSelectedSeats(e) {
    this.send({ type: "seathold:set_selected_seats", seatIds: e });
  }
  holdCreated(e, s) {
    this.send({
      type: "seathold:hold_created",
      holdId: e,
      holdToken: e,
      sessionToken: e,
      expiresAt: s
    });
  }
  releaseHold() {
    this.send({ type: "seathold:release_hold" });
  }
  updateSession(e, s) {
    this.sessionToken = e, s != null && (this.sessionExpiresAt = new Date(s).toISOString(), this.scheduleSessionRefresh()), this.send({ type: "seathold:update_session", sessionToken: e, expiresAt: s });
  }
  requestState() {
    this.send({ type: "seathold:request_state" });
  }
  setPricing(e) {
    this.send({ type: "seathold:set_pricing", pricing: e });
  }
  async createSessionToken() {
    return this.requestSessionToken("created");
  }
  async refreshSessionToken() {
    return this.requestSessionToken("updated");
  }
  async requestSessionToken(e) {
    var t, n, o, r;
    const s = await fetch(`${this.getApiBaseUrl()}/api/session-tokens`, {
      method: "POST",
      credentials: "include",
      headers: this.buildHeaders(!1, void 0, !0)
    }), i = await this.parseJson(s);
    if (!s.ok)
      throw this.createApiError("createSessionToken", s.status, i);
    return this.sessionToken = i.session_token, this.sessionExpiresAt = i.expires_at, this.scheduleSessionRefresh(), this.syncIframeSession(i.session_token, i.expires_at), e === "created" ? (n = (t = this.config).onSessionCreated) == null || n.call(t, i.session_token, i.expires_at) : (r = (o = this.config).onSessionUpdated) == null || r.call(o, i.session_token, Date.parse(i.expires_at)), i;
  }
  async ensureValidSession() {
    return !this.sessionToken || this.isSessionNearExpiry() ? this.requestSessionToken(this.sessionToken ? "updated" : "created") : {
      session_token: this.sessionToken,
      expires_at: this.sessionExpiresAt ?? (/* @__PURE__ */ new Date(0)).toISOString()
    };
  }
  async getBuilder() {
    return await this.ensureValidSession(), this.getProtectedJson("/api/render-map/builder");
  }
  async getInventory() {
    return await this.ensureValidSession(), this.getProtectedJson("/api/render-map/inventory");
  }
  async holdByLabel(e) {
    return await this.ensureValidSession(), this.postProtectedJson(`/api/inventory/${encodeURIComponent(e)}/hold`);
  }
  async releaseByLabel(e) {
    return await this.ensureValidSession(), this.postProtectedJson(`/api/inventory/${encodeURIComponent(e)}/release`);
  }
  validateAndSetPricing(e, s, i) {
    const t = (s == null ? void 0 : s.map((n) => n.key).filter(Boolean)) ?? i ?? [];
    if (t.length > 0)
      for (const n of e)
        t.includes(n.category) || console.warn(`[SeatHold] Pricing category "${n.category}" has no matching section key in the embed payload — it will have no effect.`);
    this.setPricing(e);
  }
  send(e) {
    var s;
    if (!((s = this.iframe) != null && s.contentWindow)) {
      console.warn("[SeatHold] iframe not ready yet.");
      return;
    }
    this.iframe.contentWindow.postMessage(e, this.iframeOrigin);
  }
  handleMessage(e) {
    var s, i, t, n, o, r, h, c, l, d, f, u, g, p, m, y, k, S, b, T, w, E, A;
    switch (e.type) {
      case "seathold:ready":
        const v = ((s = e.sections) == null ? void 0 : s.map((a) => a.key)) ?? e.objectKeys;
        if (v)
          for (const a of v)
            a || console.warn("[SeatHold] A bookable section has no key — it will not be commercially addressable.");
        this.config.pricing && this.config.pricing.length > 0 && this.validateAndSetPricing(this.config.pricing, e.sections, e.objectKeys), (t = (i = this.config).onReady) == null || t.call(i, e.eventId, e.objectKeys);
        break;
      case "seathold:selection_changed":
        (o = (n = this.config).onSelectionChanged) == null || o.call(n, e.seatIds, e.ticketTypes, e.objectKeys, e.items, e.pricingSelection);
        break;
      case "seathold:object_clicked":
        (h = (r = this.config).onObjectClicked) == null || h.call(r, e.objectId, e.objectType, e.objectKey, e.categoryKey);
        break;
      case "seathold:category_changed":
        (l = (c = this.config).onCategoryChanged) == null || l.call(c, e.categoryKey);
        break;
      case "seathold:view_changed":
        (f = (d = this.config).onViewChanged) == null || f.call(d, e.zoom, e.position);
        break;
      case "seathold:hold_created":
        (g = (u = this.config).onHoldCreated) == null || g.call(u, e.holdId, e.holdToken, e.expiresAt, e.seatIds, e.ticketTypes, e.objectKeys ?? [], e.items ?? []);
        break;
      case "seathold:hold_released":
        (m = (p = this.config).onHoldReleased) == null || m.call(p);
        break;
      case "seathold:state":
        (k = (y = this.config).onState) == null || k.call(y, {
          eventId: e.eventId,
          selectedSeatIds: e.selectedSeatIds,
          holdId: e.holdId,
          holdToken: e.holdToken,
          sessionToken: e.sessionToken ?? null,
          sessionExpiresAt: e.sessionExpiresAt ?? e.expiresAt,
          expiresAt: e.expiresAt
        });
        break;
      case "seathold:session_created":
        this.sessionToken = e.sessionToken, this.sessionExpiresAt = e.expiresAt, this.scheduleSessionRefresh(), (b = (S = this.config).onSessionCreated) == null || b.call(S, e.sessionToken, e.expiresAt);
        break;
      case "seathold:session_updated":
        this.sessionToken = e.sessionToken, this.sessionExpiresAt = e.expiresAt != null ? new Date(e.expiresAt).toISOString() : null, this.scheduleSessionRefresh(), (w = (T = this.config).onSessionUpdated) == null || w.call(T, e.sessionToken, e.expiresAt);
        break;
      case "seathold:error":
        (A = (E = this.config).onError) == null || A.call(E, e.action, e.message);
        break;
    }
  }
  buildEmbedUrl() {
    const e = this.config.baseUrl.replace(/\/$/, ""), s = new URLSearchParams({
      event_id: this.config.event,
      workspace_key: this.config.workspaceKey,
      ...this.sessionToken ? { session_token: this.sessionToken } : {},
      ...this.config.mode ? { mode: this.config.mode } : {}
    });
    return `${e}/embed/render?${s.toString()}`;
  }
  getApiBaseUrl() {
    return this.config.baseUrl.replace(/\/$/, "");
  }
  buildHeaders(e, s, i = !1) {
    const t = {
      "X-SeatHold-Event-Id": this.config.event,
      "X-SeatHold-Public-Key": this.config.workspaceKey
    };
    if (e) {
      const n = s ?? this.sessionToken;
      if (!n)
        throw this.createApiError("missingSessionToken", 400, { code: "session_token_required" });
      t["X-SeatHold-Session-Token"] = n;
    }
    return i && this.config.environment && (t["X-SeatHold-Environment"] = this.config.environment), t;
  }
  async getProtectedJson(e) {
    const s = await fetch(`${this.getApiBaseUrl()}${e}`, {
      method: "GET",
      credentials: "include",
      headers: this.buildHeaders(!0)
    }), i = await this.parseJson(s);
    if (!s.ok)
      throw this.createApiError(e, s.status, i);
    return i;
  }
  async postProtectedJson(e) {
    const s = await fetch(`${this.getApiBaseUrl()}${e}`, {
      method: "POST",
      credentials: "include",
      headers: this.buildHeaders(!0)
    }), i = await this.parseJson(s);
    if (!s.ok)
      throw this.createApiError(e, s.status, i);
    return i;
  }
  async parseJson(e) {
    const s = await e.text();
    if (!s) return {};
    try {
      return JSON.parse(s);
    } catch {
      return { message: s };
    }
  }
  createApiError(e, s, i) {
    var r, h;
    const t = typeof i == "object" && i !== null && "code" in i ? String(i.code) : void 0, n = typeof i == "object" && i !== null && "message" in i ? String(i.message) : void 0, o = new Error(n ?? `SeatHold API request failed for ${e}`);
    return o.code = t, o.status = s, o.payload = i, (h = (r = this.config).onError) == null || h.call(r, e, o.message), o;
  }
  isSessionNearExpiry() {
    if (!this.sessionExpiresAt) return !1;
    const e = this.config.sessionRefreshBufferMs ?? 3e4;
    return Date.parse(this.sessionExpiresAt) - Date.now() <= e;
  }
  scheduleSessionRefresh() {
    if (this.sessionRefreshTimer && (clearTimeout(this.sessionRefreshTimer), this.sessionRefreshTimer = null), !this.sessionExpiresAt) return;
    const e = this.config.sessionRefreshBufferMs ?? 3e4, s = Date.parse(this.sessionExpiresAt) - Date.now() - e;
    s <= 0 || (this.sessionRefreshTimer = setTimeout(async () => {
      try {
        await this.requestSessionToken("updated");
      } catch {
      }
    }, s));
  }
  syncIframeSession(e, s) {
    const i = Date.parse(s);
    Number.isNaN(i) || this.send({ type: "seathold:update_session", sessionToken: e, expiresAt: i });
  }
  resolveSize(e, s) {
    return e == null ? s : typeof e == "number" ? `${e}px` : e;
  }
}
export {
  _ as SeatingChart
};
