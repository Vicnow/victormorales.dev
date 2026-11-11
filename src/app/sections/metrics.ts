import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { Metric } from '../content/cv';

const DURATION = 1800;
const STAGGER = 160;
const number = new Intl.NumberFormat('es-MX');

// Arranca rápido y frena al final: el número "aterriza" en su valor.
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Las cifras de un puesto en grande, con contadores que corren al entrar en pantalla.
 * El prerender ya trae los valores finales (sin JavaScript se lee igual);
 * en el navegador se reinician y se animan una sola vez.
 */
@Component({
  selector: 'app-metrics',
  templateUrl: './metrics.html',
  styleUrl: './metrics.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-armed]': "phase() === 'armed'",
    '[class.is-in]': "phase() === 'in'",
  },
})
export class Metrics {
  readonly metrics = input.required<Metric[]>();

  /** Avance de cada contador, de 0 a 1 (null = todos terminados, como en el prerender). */
  private readonly raw = signal<number[] | null>(null);
  protected readonly progress = computed(() => this.raw() ?? this.metrics().map(() => 1));
  /** 'idle' = prerender/sin animación, 'armed' = esperando el scroll, 'in' = en pantalla. */
  protected readonly phase = signal<'idle' | 'armed' | 'in'>('idle');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let frame = 0;
    let observer: IntersectionObserver | undefined;

    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    });

    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const count = this.metrics().length;
      this.raw.set(Array(count).fill(0));
      this.phase.set('armed');

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer?.disconnect();
          this.phase.set('in');

          const start = performance.now();
          const tick = (now: number) => {
            const values = Array.from({ length: count }, (_, i) =>
              easeOutExpo(Math.max(0, now - start - i * STAGGER) / DURATION),
            );
            this.raw.set(values);
            if (values.some((v) => v < 1)) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        },
        // Dispara cuando el bloque ya subió un poco más allá del borde inferior.
        { rootMargin: '0px 0px -15% 0px' },
      );
      observer.observe(host);
    });
  }

  protected current(metric: Metric, i: number): number {
    const from = metric.from ?? 0;
    return Math.round(from + (metric.value - from) * this.progress()[i]);
  }

  protected display(metric: Metric, i: number): string {
    return number.format(this.current(metric, i));
  }

  /** Ancho de la barra "ahora" relativo a "antes". */
  protected barWidth(metric: Metric, i: number): string {
    if (!metric.before) return `${this.progress()[i] * 100}%`;
    return `${(this.current(metric, i) / metric.before.value) * 100}%`;
  }
}
