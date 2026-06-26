class H {
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
    return i.src = s, i.style.width = this.resolveSize(this.config.width, "100%"), i.style.height = this.resolveSize(this.config.height, "600px"), i.style.border = "none", i.allow = "fullscreen", this.iframe = i, e.innerHTML = "", e.appendChild(i), this.messageHandler = (t) => {
      t.origin === this.iframeOrigin && this.handleMessage(t.data);
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
  validateAndSetPricing(e, s) {
    if (s && s.length > 0)
      for (const i of e)
        s.includes(i.category) || console.warn(`[SeatHold] Pricing category "${i.category}" has no matching object_key in the map — it will have no effect.`);
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
    var s, i, t, o, n, r, h, c, l, d, a, g, f, m, p, y, b, k, u, w;
    switch (e.type) {
      case "seathold:ready":
        if (e.objectKeys)
          for (const S of e.objectKeys)
            S || console.warn("[SeatHold] A bookable object has no object_key — it will not be commercially addressable.");
        this.config.pricing && this.config.pricing.length > 0 && this.validateAndSetPricing(this.config.pricing, e.objectKeys), (i = (s = this.config).onReady) == null || i.call(s, e.eventId);
        break;
      case "seathold:selection_changed":
        (o = (t = this.config).onSelectionChanged) == null || o.call(t, e.seatIds, e.ticketTypes, e.objectKeys ?? [], e.items ?? []);
        break;
      case "seathold:object_clicked":
        (r = (n = this.config).onObjectClicked) == null || r.call(n, e.objectId, e.objectType, e.objectKey);
        break;
      case "seathold:category_changed":
        (c = (h = this.config).onCategoryChanged) == null || c.call(h, e.categoryKey);
        break;
      case "seathold:view_changed":
        (d = (l = this.config).onViewChanged) == null || d.call(l, e.zoom, e.position);
        break;
      case "seathold:hold_created":
        (g = (a = this.config).onHoldCreated) == null || g.call(a, e.holdId, e.holdToken, e.expiresAt, e.seatIds, e.ticketTypes, e.objectKeys ?? [], e.items ?? []);
        break;
      case "seathold:hold_released":
        (m = (f = this.config).onHoldReleased) == null || m.call(f);
        break;
      case "seathold:state":
        (y = (p = this.config).onState) == null || y.call(p, {
          eventId: e.eventId,
          selectedSeatIds: e.selectedSeatIds,
          holdId: e.holdId,
          holdToken: e.holdToken,
          sessionToken: e.sessionToken ?? null,
          sessionExpiresAt: e.sessionExpiresAt ?? e.expiresAt,
          expiresAt: e.expiresAt
        });
        break;
      case "seathold:session_updated":
        (k = (b = this.config).onSessionUpdated) == null || k.call(b, e.sessionToken, e.expiresAt);
        break;
      case "seathold:error":
        (w = (u = this.config).onError) == null || w.call(u, e.action, e.message);
        break;
    }
  }
  buildEmbedUrl() {
    const e = this.config.baseUrl.replace(/\/$/, ""), s = new URLSearchParams({
      workspace_key: this.config.workspaceKey,
      ...this.config.sessionToken ? { session_token: this.config.sessionToken } : {}
    });
    return `${e}/embed/${this.config.event}?${s.toString()}`;
  }
  resolveSize(e, s) {
    return e == null ? s : typeof e == "number" ? `${e}px` : e;
  }
}
export {
  H as SeatingChart
};
