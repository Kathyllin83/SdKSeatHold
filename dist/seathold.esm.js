class u {
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
  createHold(e) {
    this.send({ type: "seathold:create_hold", seatIds: e });
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
  send(e) {
    var s;
    if (!((s = this.iframe) != null && s.contentWindow)) {
      console.warn("[SeatHold] iframe not ready yet.");
      return;
    }
    this.iframe.contentWindow.postMessage(e, this.iframeOrigin);
  }
  handleMessage(e) {
    var s, i, t, n, o, r, h, a, c, d, l, g, f, m, p, y;
    switch (e.type) {
      case "seathold:ready":
        this.config.pricing && this.config.pricing.length > 0 && this.setPricing(this.config.pricing), (i = (s = this.config).onReady) == null || i.call(s, e.eventId);
        break;
      case "seathold:selection_changed":
        (n = (t = this.config).onSelectionChanged) == null || n.call(t, e.seatIds, e.ticketTypes);
        break;
      case "seathold:object_clicked":
        (r = (o = this.config).onObjectClicked) == null || r.call(o, e.objectId, e.objectType);
        break;
      case "seathold:category_changed":
        (a = (h = this.config).onCategoryChanged) == null || a.call(h, e.categoryId);
        break;
      case "seathold:view_changed":
        (d = (c = this.config).onViewChanged) == null || d.call(c, e.zoom, e.position);
        break;
      case "seathold:hold_created":
        (g = (l = this.config).onHoldCreated) == null || g.call(l, e.holdId, e.holdToken, e.expiresAt, e.seatIds, e.ticketTypes);
        break;
      case "seathold:hold_released":
        (m = (f = this.config).onHoldReleased) == null || m.call(f);
        break;
      case "seathold:error":
        (y = (p = this.config).onError) == null || y.call(p, e.action, e.message);
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
  u as SeatingChart
};
