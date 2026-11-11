/**
 * Qué herramienta del Stack usé en qué puesto, deducido de cv.ts (etiquetas y viñetas de
 * cada puesto), y los puestos acomodados en una línea de tiempo. Nada se captura dos veces:
 * si cambia el CV, esto cambia solo.
 */
import { ROLES, STACK } from './cv';

/** Cómo aparece cada herramienta en los puestos cuando no es su nombre tal cual. */
const ALIASES: Record<string, string[]> = {
  'Angular y AngularJS': ['Angular', 'AngularJS'],
  'Agentes y subagentes': ['agentes'],
};

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');

/** Coincidencia de palabra completa: "Java" no cuenta dentro de "JavaScript", ni "Git" en "GitHub". */
const matcher = (alias: string) => new RegExp(`(?<![\\w])${escape(fold(alias))}(?![\\w])`);

/** Meses desde el año 0, para medir y comparar fechas con enteros. */
function parseMonth(text: string, now: Date): number {
  const t = fold(text.trim());
  if (t === 'hoy') return now.getFullYear() * 12 + now.getMonth();
  const [month, year] = t.split(/\s+/);
  return Number(year) * 12 + MONTHS.indexOf(month);
}

export interface Span {
  company: string;
  title: string;
  /** "2021–2025" */
  years: string;
  start: number;
  end: number;
  /** Carril: dos puestos que se enciman van en filas distintas. */
  lane: number;
}

const now = new Date();

/** Puestos de más antiguo a más reciente, cada uno en el primer carril libre. */
export const SPANS: Span[] = (() => {
  const laneEnds: number[] = [];
  return [...ROLES].reverse().map((role) => {
    const [from, to] = role.period.split('–');
    const start = parseMonth(from, now);
    const end = parseMonth(to, now) + 1;
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    const endYear = fold(to.trim()) === 'hoy' ? 'hoy' : String(Math.floor((end - 1) / 12));
    return { company: role.company, title: role.title, years: `${Math.floor(start / 12)}–${endYear}`, start, end, lane };
  });
})();

export const LANES = Math.max(...SPANS.map((s) => s.lane)) + 1;
export const TIMELINE_START = Math.floor(Math.min(...SPANS.map((s) => s.start)) / 12) * 12;
export const TIMELINE_END = Math.max(...SPANS.map((s) => s.end));

/** Herramienta del Stack → empresas donde la usé (campo uses, etiquetas o viñetas del puesto). */
export const USAGE: Record<string, string[]> = Object.fromEntries(
  STACK.flatMap((g) => g.items).map((item) => {
    const patterns = (ALIASES[item] ?? [item]).map(matcher);
    const companies = ROLES.filter((role) => {
      if (role.uses?.includes(item)) return true;
      const text = fold([...role.stack, ...role.points].join(' \n '));
      return patterns.some((p) => p.test(text));
    }).map((r) => r.company);
    return [item, companies];
  }),
);
