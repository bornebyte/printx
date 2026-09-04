import { EventEmitter } from "node:events";
import { ensureBackendReady, handleRequest } from "../../../../backend/server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NodeLikeRequest = EventEmitter & {
  method: string;
  url: string;
  headers: Record<string, string>;
  destroy: (error?: Error) => void;
};

type NodeLikeResponse = {
  headersSent: boolean;
  writeHead: (statusCode: number, headers?: Record<string, string | number>) => void;
  end: (body?: string | Uint8Array) => void;
  destroy: () => void;
};

function createNodeRequest(request: Request) {
  const nodeRequest = new EventEmitter() as NodeLikeRequest;
  const requestUrl = new URL(request.url);
  nodeRequest.method = request.method;
  nodeRequest.url = `${requestUrl.pathname}${requestUrl.search}`;
  nodeRequest.headers = Object.fromEntries(request.headers.entries());
  nodeRequest.destroy = (error) => {
    if (error) nodeRequest.emit("error", error);
  };

  queueMicrotask(() => {
    request.arrayBuffer()
      .then((body) => {
        if (body.byteLength) nodeRequest.emit("data", Buffer.from(body));
        nodeRequest.emit("end");
      })
      .catch((error) => nodeRequest.emit("error", error));
  });

  return nodeRequest;
}

function forwardToBackend(request: Request) {
  return new Promise<Response>((resolve, reject) => {
    const nodeRequest = createNodeRequest(request);
    let statusCode = 200;
    let responseHeaders = new Headers();
    let settled = false;

    const finish = (body?: string | Uint8Array) => {
      if (settled) return;
      settled = true;
      const responseBody = typeof body === "string" ? body : body ? new Uint8Array(body) : null;
      resolve(new Response(responseBody, { status: statusCode, headers: responseHeaders }));
    };

    const nodeResponse: NodeLikeResponse = {
      headersSent: false,
      writeHead(status, headers = {}) {
        statusCode = status;
        responseHeaders = new Headers(Object.entries(headers).map(([key, value]) => [key, String(value)]));
        this.headersSent = true;
      },
      end(body) {
        finish(body);
      },
      destroy() {
        if (!settled) reject(new Error("PrintX backend response was destroyed."));
      },
    };

    handleRequest(nodeRequest, nodeResponse).catch(reject);
  });
}

async function route(request: Request) {
  await ensureBackendReady();
  return forwardToBackend(request);
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const DELETE = route;
export const OPTIONS = route;
