class x {
  constructor(e) {
    this.iframe = null, this.messageHandler = null, this.iframeOrigin = "", this.sessionRefreshTimer = null, this.config = e, this.sessionToken = e.sessionToken ?? null, this.sessionExpiresAt = e.sessionExpiresAt ?? null, /^\d+$/.test(e.event) || console.warn(`[ReservaAqui] config.event "${e.event}" does not look like a numeric event ID. X-SeatHold-Event-Id must be the numeric database ID of the event, not a slug or UUID.`);
  }
  render() {
    const e = document.getElementById(this.config.divId);
    if (!e)
      throw new Error(`[ReservaAqui] Element #${this.config.divId} not found.`);
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
    this.send({ type: "reserva-aqui:set_selected_seats", seatIds: e });
  }
  holdCreated(e, s) {
    this.send({
      type: "reserva-aqui:hold_created",
      holdId: e,
      holdToken: e,
      sessionToken: e,
      expiresAt: s
    });
  }
  releaseHold() {
    this.send({ type: "reserva-aqui:release_hold" });
  }
  updateSession(e, s) {
    this.sessionToken = e, s != null && (this.sessionExpiresAt = s, this.scheduleSessionRefresh()), this.send({ type: "reserva-aqui:update_session", sessionToken: e, expiresAt: s });
  }
  requestState() {
    this.send({ type: "reserva-aqui:request_state" });
  }
  setPricing(e) {
    this.send({ type: "reserva-aqui:set_pricing", pricing: e });
  }
  async createSessionToken() {
    return this.requestSessionToken("created");
  }
  async refreshSessionToken() {
    return this.requestSessionToken("updated");
  }
  async requestSessionToken(e) {
    var t, n, r, o;
    const s = await fetch(`${this.getApiBaseUrl()}/api/session-tokens`, {
      method: "POST",
      credentials: "include",
      headers: this.buildHeaders(!1, void 0, !0)
    }), i = await this.parseJson(s);
    if (!s.ok)
      throw this.createApiError("createSessionToken", s.status, i);
    return this.sessionToken = i.session_token, this.sessionExpiresAt = i.expires_at, this.scheduleSessionRefresh(), this.syncIframeSession(i.session_token, i.expires_at), e === "created" ? (n = (t = this.config).onSessionCreated) == null || n.call(t, i.session_token, i.expires_at) : (o = (r = this.config).onSessionUpdated) == null || o.call(r, i.session_token, i.expires_at), i;
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
        t.includes(n.category) || console.warn(`[ReservaAqui] Pricing category "${n.category}" has no matching section key in the embed payload — it will have no effect.`);
    this.setPricing(e);
  }
  send(e) {
    var s;
    if (!((s = this.iframe) != null && s.contentWindow)) {
      console.warn("[ReservaAqui] iframe not ready yet.");
      return;
    }
    this.iframe.contentWindow.postMessage(e, this.iframeOrigin);
  }
  handleMessage(e) {
    var s, i, t, n, r, o, a, c, l, d, u, f, g, p, m, y, k, S, v, b, T, w, A;
    switch (e.type) {
      case "reserva-aqui:ready":
        const E = ((s = e.sections) == null ? void 0 : s.map((h) => h.key)) ?? e.objectKeys;
        if (E)
          for (const h of E)
            h || console.warn("[ReservaAqui] A bookable section has no key — it will not be commercially addressable.");
        this.config.pricing && this.config.pricing.length > 0 && this.validateAndSetPricing(this.config.pricing, e.sections, e.objectKeys), (t = (i = this.config).onReady) == null || t.call(i, e.eventId, e.objectKeys);
        break;
      case "reserva-aqui:selection_changed":
        (r = (n = this.config).onSelectionChanged) == null || r.call(n, e.seatIds, e.ticketTypes, e.objectKeys, e.items, e.pricingSelection);
        break;
      case "reserva-aqui:object_clicked":
        (a = (o = this.config).onObjectClicked) == null || a.call(o, e.objectId, e.objectType, e.objectKey, e.categoryKey);
        break;
      case "reserva-aqui:category_changed":
        (l = (c = this.config).onCategoryChanged) == null || l.call(c, e.categoryKey);
        break;
      case "reserva-aqui:view_changed":
        (u = (d = this.config).onViewChanged) == null || u.call(d, e.zoom, e.position);
        break;
      case "reserva-aqui:hold_created":
        (g = (f = this.config).onHoldCreated) == null || g.call(f, e.holdId, e.holdToken, e.expiresAt, e.seatIds, e.ticketTypes, e.objectKeys ?? [], e.items ?? []);
        break;
      case "reserva-aqui:hold_released":
        (m = (p = this.config).onHoldReleased) == null || m.call(p);
        break;
      case "reserva-aqui:state":
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
      case "reserva-aqui:session_created":
        this.sessionToken = e.sessionToken, this.sessionExpiresAt = e.expiresAt, this.scheduleSessionRefresh(), (v = (S = this.config).onSessionCreated) == null || v.call(S, e.sessionToken, e.expiresAt);
        break;
      case "reserva-aqui:session_updated":
        this.sessionToken = e.sessionToken, this.sessionExpiresAt = e.expiresAt ?? null, this.scheduleSessionRefresh(), (T = (b = this.config).onSessionUpdated) == null || T.call(b, e.sessionToken, e.expiresAt);
        break;
      case "reserva-aqui:error":
        (A = (w = this.config).onError) == null || A.call(w, e.action, e.message);
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
    var o, a;
    const t = typeof i == "object" && i !== null && "code" in i ? String(i.code) : void 0, n = typeof i == "object" && i !== null && "message" in i ? String(i.message) : void 0, r = new Error(n ?? `SeatHold API request failed for ${e}`);
    return r.code = t, r.status = s, r.payload = i, (a = (o = this.config).onError) == null || a.call(o, e, r.message), r;
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
    this.send({ type: "reserva-aqui:update_session", sessionToken: e, expiresAt: s });
  }
  resolveSize(e, s) {
    return e == null ? s : typeof e == "number" ? `${e}px` : e;
  }
}
export {
  x as SeatingChart
};
