class x {
  constructor(e) {
    this.iframe = null, this.messageHandler = null, this.iframeOrigin = "", this.config = e;
  }
  render() {
    const e = document.getElementById(this.config.divId);
    if (!e)
      throw new Error(`[SeatHold] Element #${this.config.divId} not found.`);
    const s = this.buildEmbedUrl();
    this.iframeOrigin = new URL(this.config.baseUrl).origin;
    const i = document.createElement("iframe");
    return i.src = s, i.style.width = this.resolveSize(this.config.width, "100%"), i.style.height = this.resolveSize(this.config.height, "600px"), i.style.border = "none", i.allow = "fullscreen", this.iframe = i, e.innerHTML = "", e.appendChild(i), this.messageHandler = (o) => {
      o.origin === this.iframeOrigin && this.handleMessage(o.data);
    }, window.addEventListener("message", this.messageHandler), this;
  }
  destroy() {
    this.messageHandler && (window.removeEventListener("message", this.messageHandler), this.messageHandler = null), this.iframe && (this.iframe.remove(), this.iframe = null);
  }
  setSelectedSeats(e) {
    this.send({ type: "seathold:set_selected_seats", seatIds: e });
  }
  holdCreated(e, s) {
    this.send({ type: "seathold:hold_created", sessionToken: e, expiresAt: s });
  }
  releaseHold() {
    this.send({ type: "seathold:release_hold" });
  }
  updateSession(e, s) {
    this.send({ type: "seathold:update_session", sessionToken: e, expiresAt: s });
  }
  requestState() {
    this.send({ type: "seathold:request_state" });
  }
  setPricing(e) {
    this.send({ type: "seathold:set_pricing", pricing: e });
  }
  validateAndSetPricing(e, s, i) {
    const o = (s == null ? void 0 : s.map((t) => t.key).filter(Boolean)) ?? i ?? [];
    if (o.length > 0)
      for (const t of e)
        o.includes(t.category) || console.warn(`[SeatHold] Pricing category "${t.category}" has no matching section key in the embed payload — it will have no effect.`);
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
    var s, i, o, t, r, c, h, l, d, a, g, f, m, y, p, b, k, u, w, S, _, v, H;
    switch (e.type) {
      case "seathold:ready":
        const I = ((s = e.sections) == null ? void 0 : s.map((n) => n.key)) ?? e.objectKeys;
        if (I)
          for (const n of I)
            n || console.warn("[SeatHold] A bookable section has no key — it will not be commercially addressable.");
        this.config.pricing && this.config.pricing.length > 0 && this.validateAndSetPricing(this.config.pricing, e.sections, e.objectKeys), (o = (i = this.config).onReady) == null || o.call(i, e.eventId, e.objectKeys);
        break;
      case "seathold:selection_changed":
        (r = (t = this.config).onSelectionChanged) == null || r.call(t, e.seatIds, e.ticketTypes, e.objectKeys, e.items, e.pricingSelection);
        break;
      case "seathold:object_clicked":
        (h = (c = this.config).onObjectClicked) == null || h.call(c, e.objectId, e.objectType, e.objectKey, e.categoryKey);
        break;
      case "seathold:category_changed":
        (d = (l = this.config).onCategoryChanged) == null || d.call(l, e.categoryKey);
        break;
      case "seathold:view_changed":
        (g = (a = this.config).onViewChanged) == null || g.call(a, e.zoom, e.position);
        break;
      case "seathold:hold_created":
        (m = (f = this.config).onHoldCreated) == null || m.call(f, e.holdId, e.holdToken, e.expiresAt, e.seatIds, e.ticketTypes, e.objectKeys ?? [], e.items ?? []);
        break;
      case "seathold:hold_released":
        (p = (y = this.config).onHoldReleased) == null || p.call(y);
        break;
      case "seathold:state":
        (k = (b = this.config).onState) == null || k.call(b, {
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
        (w = (u = this.config).onSessionCreated) == null || w.call(u, e.sessionToken, e.expiresAt);
        break;
      case "seathold:session_updated":
        (_ = (S = this.config).onSessionUpdated) == null || _.call(S, e.sessionToken, e.expiresAt);
        break;
      case "seathold:error":
        (H = (v = this.config).onError) == null || H.call(v, e.action, e.message);
        break;
    }
  }
  buildEmbedUrl() {
    const e = this.config.baseUrl.replace(/\/$/, ""), s = new URLSearchParams({
      workspace_key: this.config.workspaceKey,
      ...this.config.sessionToken ? { session_token: this.config.sessionToken } : {},
      ...this.config.mode ? { mode: this.config.mode } : {}
    });
    return `${e}/embed/${this.config.event}?${s.toString()}`;
  }
  resolveSize(e, s) {
    return e == null ? s : typeof e == "number" ? `${e}px` : e;
  }
}
export {
  x as SeatingChart
};
