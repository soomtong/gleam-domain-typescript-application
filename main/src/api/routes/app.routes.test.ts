import { describe, expect, it } from 'bun:test';

process.env.NODE_ENV = 'test';
process.env.BUN_TEST = '1';

let apiFetch: ((request: Request) => Promise<Response>) | undefined;

async function getApiFetch(): Promise<(request: Request) => Promise<Response>> {
  if (apiFetch) return apiFetch;

  const originalLog = console.log;
  console.log = () => {};
  try {
    const mod = await import('../../index');
    apiFetch = mod.default.fetch as (request: Request) => Promise<Response>;
    return apiFetch;
  } finally {
    console.log = originalLog;
  }
}

async function requestJson<T>(method: string, path: string): Promise<{ status: number; json: T }> {
  const fetchFn = await getApiFetch();
  const request = new Request(`http://localhost${path}`, { method });
  const response = await fetchFn(request);
  const json = (await response.json()) as T;
  return { status: response.status, json };
}

describe('app routes', () => {
  it('GET / health check returns server info', async () => {
    const { status, json } = await requestJson<any>('GET', '/');
    expect(status).toBe(200);
    expect(json.status).toBe('ok');
    expect(json.endpoints.products).toBe('/products');
    expect(json.endpoints.coupons).toBe('/coupons');
    expect(json.endpoints.carts).toBe('/carts');
    expect(json.endpoints.orders).toBe('/orders');
    expect(json.endpoints.payments).toBe('/payments');
  });
});


