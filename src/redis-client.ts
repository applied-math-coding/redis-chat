const redis = require("redis");

export function createClient() {
  return new Client();
}

export class Client {
  #wrapped: any;
  #isConnected = false;

  get wrapped() {
    return this.#wrapped;
  }

  constructor() {
    this.#wrapped = redis.createClient();
    this.#wrapped.on(
      'error',
      (err: any) => console.log('Redis Client Error', err)
    );
    this.#wrapped.on(
      'connect',
      () => this.#isConnected = true
    );
  }

  connect(): Promise<void> {
    return this.#isConnected ? Promise.resolve() : new Promise<void>(
      res => this.#wrapped.on(
        'connect',
        () => {
          this.#isConnected = true;
          res();
        }
      )
    );
  }

  publish(channel: string, message: string) {
    this.#wrapped.publish(channel, message);
  }

  duplicate(): Client {
    return new Client();
  }

  subscribe(channel: string, clb: (m: string) => void): Promise<void> {
    this.#wrapped.subscribe(channel);
    return new Promise<void>(res => {
      this.#wrapped.on('subscribe', () => {
        this.#wrapped.on('message', (_: unknown, message: string) => clb(message));
        res();
      });
    });
  }

  get(key: string): Promise<any> {
    return new Promise(
      (res, rej) => this.#wrapped.get(key, (e: any, r: any) => e ? rej(e) : res(r))
    );
  }

  set(key: string, value: string): Promise<any> {
    return new Promise(
      (res, rej) => this.#wrapped.set(key, value, (e: any, r: any) => e ? rej(e) : res(r))
    );
  }

  sendCommand([cmd, ...args]: [string, ...any[]]): Promise<any> {
    return new Promise(
      (res, rej) => this.#wrapped.sendCommand(cmd, args, (e: any, r: any) => e ? rej(e) : res(r))
    );
  }
}