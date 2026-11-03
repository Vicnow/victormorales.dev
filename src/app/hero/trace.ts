import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { RowKey } from '../journey/journey';
import { JourneyStore } from '../journey/journey-store';

const ROWS: { key: RowKey; label: string }[] = [
  { key: 'dns', label: 'DNS' },
  { key: 'tls', label: 'TLS' },
  { key: 'get', label: 'GET /' },
  { key: 'ok', label: '200' },
];

const BADGES = { reading: 'leyendo…', live: 'en vivo', demo: 'demo' };

/** Píldora compacta: aparece al terminar el recorrido y el detalle se abre a pedido. */
@Component({
  selector: 'app-trace',
  templateUrl: './trace.html',
  styleUrl: './trace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'complementary',
    'aria-label': 'Recorrido de tu petición',
    '[class.is-shown]': 'store.traceShown()',
    '[class.is-open]': 'open()',
  },
})
export class Trace {
  protected readonly store = inject(JourneyStore);
  protected readonly rows = ROWS;
  protected readonly open = signal(false);
  protected readonly badge = computed(() => BADGES[this.store.badge()]);
  readonly replay = output();
}
