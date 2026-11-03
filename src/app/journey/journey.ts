/**
 * Lo que de verdad pasó con la petición: tiempos del navegador + cabeceras de CloudFront.
 * Funciones puras, sin Angular ni Three.js; solo se llaman en el navegador.
 */

export type NodeKey = 'you' | 'r53' | 'cf' | 's3';
export type RowKey = 'dns' | 'tls' | 'get' | 'ok';

export interface Journey {
  pop: string;
  cache: string;
  id: string;
  dns: number;
  connect: number;
  ttfb: number;
  total: number;
  bytes: number;
  protocol: string;
  /** La página salió de la caché del navegador: no hubo viaje que medir. */
  local: boolean;
  /** Datos reales de CloudFront (false = modo demo). */
  live: boolean;
}

export interface Row {
  v: string;
  ms: number;
  d: string;
}

export interface JourneyInfo {
  city: string | null;
  hit: boolean;
  edge: string;
  summary: string;
  rows: Record<RowKey, Row>;
}

// Códigos IATA de los edges de CloudFront más probables para tu audiencia.
const POPS: Record<string, string> = {
  MEX: 'Ciudad de México', QRO: 'Querétaro', GDL: 'Guadalajara', MTY: 'Monterrey',
  DFW: 'Dallas', IAH: 'Houston', HOU: 'Houston', LAX: 'Los Ángeles', SFO: 'San Francisco',
  SEA: 'Seattle', ORD: 'Chicago', ATL: 'Atlanta', MIA: 'Miami', IAD: 'Ashburn',
  JFK: 'Nueva York', EWR: 'Newark', BOS: 'Boston', DEN: 'Denver', PHX: 'Phoenix',
  YTO: 'Toronto', YUL: 'Montreal', YVR: 'Vancouver', BOG: 'Bogotá', LIM: 'Lima',
  SCL: 'Santiago', GRU: 'São Paulo', EZE: 'Buenos Aires', MAD: 'Madrid', BCN: 'Barcelona',
  LHR: 'Londres', CDG: 'París', FRA: 'Fráncfort', AMS: 'Ámsterdam', NRT: 'Tokio', SIN: 'Singapur',
};

const PROTOCOLS: Record<string, string> = { h2: 'HTTP/2', h3: 'HTTP/3', 'http/1.1': 'HTTP/1.1' };

export const CACHE_LABELS: Record<string, string> = { Hit: 'HIT', Miss: 'MISS', RefreshHit: 'REFRESH' };

// Valores de ejemplo para cuando la página no viene de CloudFront (local, previews).
const DEMO = { pop: 'DFW59-P8', id: '', dns: 32, connect: 118, ttfb: 157, total: 412, bytes: 38_900, protocol: 'h2', local: false };

export const fmtMs = (ms: number) => `${Math.max(0, Math.round(ms))} ms`;
const fmtKB = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export async function readJourney(): Promise<Journey> {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const forced = new URLSearchParams(location.search).get('cache');
  let edge: Pick<Journey, 'pop' | 'cache' | 'id'> | null = null;

  // Preferido: Server-Timing de CloudFront, que describe esta misma navegación.
  const timing = Object.fromEntries((nav?.serverTiming ?? []).map((entry) => [entry.name, entry]));
  if (timing['cdn-pop']) {
    edge = {
      pop: timing['cdn-pop'].description,
      cache: timing['cdn-cache-miss'] ? 'Miss' : timing['cdn-cache-refresh'] ? 'RefreshHit' : 'Hit',
      id: timing['cdn-rid']?.description ?? '',
    };
  } else if (!forced) {
    // Respaldo: un HEAD al mismo documento para leer x-amz-cf-pop y x-cache.
    try {
      const res = await fetch(location.href, { method: 'HEAD', cache: 'no-store' });
      const pop = res.headers.get('x-amz-cf-pop');
      if (pop) {
        edge = { pop, cache: (res.headers.get('x-cache') ?? 'Hit').split(' ')[0], id: res.headers.get('x-amz-cf-id') ?? '' };
      }
    } catch {
      // Sin CloudFront delante: se queda en modo demo.
    }
  }

  if (!edge || !nav || forced) {
    return { ...DEMO, cache: forced === 'miss' ? 'Miss' : 'Hit', live: false };
  }
  return {
    ...edge,
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    connect: nav.connectEnd - nav.connectStart,
    ttfb: nav.responseStart - nav.requestStart,
    total: nav.responseEnd - nav.startTime,
    bytes: nav.encodedBodySize || nav.transferSize,
    protocol: nav.nextHopProtocol,
    local: nav.transferSize === 0,
    live: true,
  };
}

export function describe(d: Journey): JourneyInfo {
  const city = POPS[d.pop.slice(0, 3)] ?? null;
  const hit = d.cache === 'Hit';
  return {
    city,
    hit,
    edge: city ? `${d.pop} · ${city}` : d.pop,
    summary: d.local
      ? 'desde la caché de tu navegador'
      : `${fmtMs(d.total)} · ${city ?? d.pop} · ${CACHE_LABELS[d.cache] ?? d.cache}`,
    rows: {
      dns: { v: 'Route 53', ms: d.dns, d: d.dns >= 1 ? 'resolvió victormorales.dev hacia CloudFront' : 'ya estaba en la caché de tu sistema' },
      tls: { v: 'certificado ACM', ms: d.connect, d: d.connect >= 1 ? 'conexión cifrada con el edge más cercano' : 'reutilizó una conexión abierta' },
      get: { v: city ? `${d.pop} · ${city}` : d.pop, ms: d.ttfb, d: hit ? `${d.cache} · servida desde la caché del edge` : `${d.cache} · el edge fue por ella a S3` },
      ok: {
        v: `${d.bytes ? fmtKB(d.bytes) : '—'} · ${PROTOCOLS[d.protocol] ?? 'HTTPS'}`,
        ms: d.total,
        d: d.local ? 'servida desde la caché de tu navegador' : 'página entregada en tu navegador',
      },
    },
  };
}
