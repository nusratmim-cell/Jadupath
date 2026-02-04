// TypeScript declarations for Presentation API
// https://developer.mozilla.org/en-US/docs/Web/API/Presentation_API

interface PresentationConnectionAvailableEvent extends Event {
  readonly connection: PresentationConnection;
}

interface PresentationConnectionCloseEvent extends Event {
  readonly message: string;
  readonly reason: PresentationConnectionCloseReason;
}

type PresentationConnectionCloseReason = "error" | "closed" | "wentaway";

type PresentationConnectionState = "connecting" | "connected" | "closed" | "terminated";

interface PresentationConnection extends EventTarget {
  readonly id: string;
  readonly url: string;
  readonly state: PresentationConnectionState;
  onconnect: ((this: PresentationConnection, ev: Event) => void) | null;
  onclose: ((this: PresentationConnection, ev: PresentationConnectionCloseEvent) => void) | null;
  onterminate: ((this: PresentationConnection, ev: Event) => void) | null;
  onmessage: ((this: PresentationConnection, ev: MessageEvent) => void) | null;
  close(): void;
  terminate(): void;
  send(message: string | Blob | ArrayBuffer | ArrayBufferView): void;
}

interface PresentationAvailability extends EventTarget {
  readonly value: boolean;
  onchange: ((this: PresentationAvailability, ev: Event) => void) | null;
}

interface PresentationRequest extends EventTarget {
  onconnectionavailable: ((this: PresentationRequest, ev: PresentationConnectionAvailableEvent) => void) | null;
  start(): Promise<PresentationConnection>;
  reconnect(presentationId: string): Promise<PresentationConnection>;
  getAvailability(): Promise<PresentationAvailability>;
}

declare const PresentationRequest: {
  prototype: PresentationRequest;
  new(urls: string | string[]): PresentationRequest;
};

interface Presentation {
  defaultRequest: PresentationRequest | null;
  receiver: PresentationReceiver | null;
}

interface PresentationReceiver {
  readonly connectionList: Promise<PresentationConnectionList>;
}

interface PresentationConnectionList extends EventTarget {
  readonly connections: ReadonlyArray<PresentationConnection>;
  onconnectionavailable: ((this: PresentationConnectionList, ev: PresentationConnectionAvailableEvent) => void) | null;
}

interface Navigator {
  readonly presentation?: Presentation;
}

// Extend Window interface
interface Window {
  PresentationRequest?: typeof PresentationRequest;
}
