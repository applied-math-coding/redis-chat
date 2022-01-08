export class SocketStore {
  #uid = 0;
  #store = new Map<number, WebSocket>();

  add(ws: WebSocket): number {
    const id = this.#uid;
    this.#uid += 1;
    this.#store.set(id, ws);
    ws.addEventListener('close', () => this.#store.delete(id));
    return id;
  }

  get(id: number): WebSocket | undefined {
    return this.#store.get(id);
  }
}
