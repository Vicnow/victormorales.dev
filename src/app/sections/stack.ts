import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { STACK } from '../content/cv';
import { LANES, SPANS, Span, TIMELINE_END, TIMELINE_START, USAGE } from '../content/usage';
import { ToolIcon } from './tool-icon';

type Focus = { kind: 'tool'; name: string } | { kind: 'role'; company: string } | null;

const RANGE = TIMELINE_END - TIMELINE_START;
const pct = (months: number) => `${((months - TIMELINE_START) / RANGE) * 100}%`;
const list = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;

/**
 * El Stack con una línea de tiempo de los puestos: al pasar el cursor por una herramienta
 * se encienden los años en que la usé, y al pasar por un puesto, sus herramientas.
 * En táctiles el toque deja la selección fija hasta el siguiente toque.
 */
@Component({
  selector: 'app-stack',
  imports: [ToolIcon],
  templateUrl: './stack.html',
  styleUrl: './stack.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stack {
  protected readonly groups = STACK;
  protected readonly usage = USAGE;
  protected readonly lanes = LANES;
  protected readonly spans = SPANS.map((s) => ({ ...s, left: pct(s.start), width: `calc(${pct(s.end)} - ${pct(s.start)})` }));
  protected readonly years = Array.from(
    { length: Math.ceil(RANGE / 12) },
    (_, i) => ({ year: TIMELINE_START / 12 + i, left: pct(TIMELINE_START + i * 12) }),
  );

  private readonly hovered = signal<Focus>(null);
  private readonly pinned = signal<Focus>(null);
  protected readonly focus = computed(() => this.hovered() ?? this.pinned());

  /** Empresas encendidas en la línea de tiempo. */
  protected readonly litRoles = computed(() => {
    const f = this.focus();
    if (!f) return null;
    return new Set(f.kind === 'tool' ? USAGE[f.name] : [f.company]);
  });

  /** Herramientas encendidas en los grupos. */
  protected readonly litTools = computed(() => {
    const f = this.focus();
    if (!f) return null;
    if (f.kind === 'tool') return new Set([f.name]);
    return new Set(Object.keys(USAGE).filter((tool) => USAGE[tool].includes(f.company)));
  });

  protected readonly caption = computed(() => {
    const f = this.focus();
    if (!f) return null;
    if (f.kind === 'tool') return { lead: f.name, rest: `en ${list(USAGE[f.name])}` };
    const span = SPANS.find((s) => s.company === f.company)!;
    const count = this.litTools()?.size ?? 0;
    return {
      lead: `${span.company} · ${span.years}`,
      rest: count ? `${count} herramientas de este stack` : span.title,
    };
  });

  protected enter(focus: Focus) {
    this.hovered.set(focus);
  }

  protected leave() {
    this.hovered.set(null);
  }

  /** Clic o toque: fija la selección (o la suelta si ya estaba fija). */
  protected toggle(focus: NonNullable<Focus>) {
    const same = JSON.stringify(this.pinned()) === JSON.stringify(focus);
    this.pinned.set(same ? null : focus);
    this.hovered.set(null);
  }

  protected tool(name: string): NonNullable<Focus> {
    return { kind: 'tool', name };
  }

  protected role(span: Span): NonNullable<Focus> {
    return { kind: 'role', company: span.company };
  }

  protected isPinned(focus: Focus) {
    return JSON.stringify(this.pinned()) === JSON.stringify(focus);
  }
}
