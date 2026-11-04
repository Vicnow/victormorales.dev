import { Injectable, signal } from '@angular/core';
import { CACHE_LABELS, Deploy, fmtMs, Journey, JourneyInfo, NodeKey, Row, RowKey } from './journey';

export interface TagState {
  meta: string;
  on: boolean;
  dim: boolean;
  chip: string | null;
  miss: boolean;
}

export interface RowState {
  v: string;
  d: string;
  ms: string;
  on: boolean;
}

export interface Byline {
  /** static = HTML prerenderizado (sin JS); tracking = el paquete va en camino. */
  kind: 'static' | 'tracking' | 'demo' | 'cached' | 'live';
  where: string;
  ms: string;
}

const tag = (meta: string): TagState => ({ meta, on: false, dim: false, chip: null, miss: false });

const BLANK_ROWS: Record<RowKey, RowState> = {
  ci: { v: 'GitHub Actions', d: 'último deploy', ms: '—', on: false },
  dns: { v: 'Route 53', d: 'resolviendo victormorales.dev', ms: '—', on: false },
  tls: { v: 'certificado ACM', d: 'negociando conexión cifrada', ms: '—', on: false },
  get: { v: 'CloudFront', d: 'pidiendo la página al edge', ms: '—', on: false },
  ok: { v: 'respuesta', d: 'esperando la página', ms: '—', on: false },
};

/**
 * Estado de la interfaz del recorrido. La escena 3D lo actualiza paso a paso
 * y las plantillas del hero y de la traza solo lo leen.
 */
@Injectable()
export class JourneyStore {
  readonly tags = signal<Record<NodeKey, TagState>>({
    you: tag('tu navegador'), r53: tag('DNS'), cf: tag('edge'), s3: tag('bucket privado'),
    ci: tag('build + deploy'), gh: tag('repo'),
  });
  readonly rows = signal(BLANK_ROWS);
  readonly byline = signal<Byline>({ kind: 'static', where: '', ms: '' });
  readonly badge = signal<'reading' | 'live' | 'demo'>('reading');
  readonly summary = signal('siguiendo tu petición…');
  readonly foot = signal('');
  readonly traceShown = signal(false);
  readonly sceneReady = signal(false);

  reset() {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone?.split('/').pop()?.replaceAll('_', ' ');
    this.tags.set({
      you: tag(zone ? `desde ${zone}` : 'tu navegador'), r53: tag('DNS'), cf: tag('edge'), s3: tag('bucket privado'),
      ci: tag('build + deploy'), gh: tag('repo'),
    });
    this.rows.set(BLANK_ROWS);
    this.byline.set({ kind: 'tracking', where: '', ms: '' });
    this.summary.set('siguiendo tu petición…');
  }

  load(d: Journey) {
    this.badge.set(d.live ? 'live' : 'demo');
    this.foot.set(d.live
      ? `id de tu petición · ${d.id}`
      : 'Fuera de CloudFront no hay cabeceras que leer: estos datos son de ejemplo.');
  }

  arrive(key: NodeKey, meta?: string) {
    this.patchTag(key, meta ? { on: true, meta } : { on: true });
  }

  chip(key: NodeKey, cache: string) {
    this.patchTag(key, { chip: CACHE_LABELS[cache] ?? cache.toUpperCase(), miss: cache !== 'Hit' });
  }

  dim(key: NodeKey, meta: string) {
    this.patchTag(key, { dim: true, meta });
  }

  /** El nodo vuelve a reposo (sin resaltar) para la siguiente fase. */
  rest(key: NodeKey) {
    this.patchTag(key, { on: false });
  }

  revealDeploy(deploy: Deploy, ago: string) {
    this.patchRow('ci', {
      v: `${deploy.sha} · run #${deploy.run}`,
      d: 'build + deploy con GitHub Actions (OIDC)',
      ms: ago,
      on: true,
    });
  }

  reveal(key: RowKey, row: Row) {
    this.patchRow(key, { v: row.v, d: row.d, on: true });
  }

  setRowMs(key: RowKey, ms: number) {
    this.patchRow(key, { ms: fmtMs(ms) });
  }

  finish(d: Journey, info: JourneyInfo) {
    this.byline.set({
      kind: !d.live ? 'demo' : d.local ? 'cached' : 'live',
      where: info.city ?? `el edge ${d.pop}`,
      ms: fmtMs(d.total),
    });
    this.summary.set(info.summary);
    this.traceShown.set(true);
  }

  private patchTag(key: NodeKey, patch: Partial<TagState>) {
    this.tags.update((tags) => ({ ...tags, [key]: { ...tags[key], ...patch } }));
  }

  private patchRow(key: RowKey, patch: Partial<RowState>) {
    this.rows.update((rows) => ({ ...rows, [key]: { ...rows[key], ...patch } }));
  }
}
