import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { describe, NodeKey, readDeploy, readJourney } from '../journey/journey';
import type { JourneyScene } from '../journey/journey-scene';
import { JourneyStore } from '../journey/journey-store';
import { Trace } from './trace';

const NODES: { key: NodeKey; name: string; color: string }[] = [
  { key: 'you', name: 'Tú', color: 'var(--cielo)' },
  { key: 'r53', name: 'Route 53', color: 'var(--violeta)' },
  { key: 'cf', name: 'CloudFront', color: 'var(--azul)' },
  { key: 's3', name: 'S3', color: 'var(--menta)' },
  { key: 'ci', name: 'Actions', color: 'var(--ink)' },
  { key: 'gh', name: 'GitHub', color: 'var(--ink)' },
];

@Component({
  selector: 'app-hero',
  imports: [Trace],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [JourneyStore],
})
export class Hero {
  protected readonly store = inject(JourneyStore);
  protected readonly nodes = NODES;
  protected readonly stageOff = signal(false);

  private readonly hero = viewChild.required<ElementRef<HTMLElement>>('hero');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly tagRefs = viewChildren<ElementRef<HTMLElement>>('tagEl');
  private scene: JourneyScene | null = null;

  constructor() {
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      this.scene?.destroy();
    });

    // Solo en el navegador: el prerender entrega el HTML y aquí se enciende la escena.
    afterNextRender(async () => {
      const [{ JourneyScene }, journey] = await Promise.all([import('../journey/journey-scene'), readJourney()]);
      if (destroyed) return;

      const tags = Object.fromEntries(this.tagRefs().map((ref, i) => [NODES[i].key, ref.nativeElement])) as Record<NodeKey, HTMLElement>;
      const scene = new JourneyScene({
        hero: this.hero().nativeElement,
        stage: this.stage().nativeElement,
        canvas: this.canvas().nativeElement,
        tags,
      }, this.store);
      this.scene = scene;
      this.stageOff.set(!scene.hasWebGL);
      this.store.load(journey);

      await scene.whenVisible();
      if (!destroyed) void scene.play(journey, describe(journey), readDeploy());
    });
  }

  protected replay() {
    this.scene?.replay();
  }
}
