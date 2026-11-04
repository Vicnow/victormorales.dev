import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TOOL_ICONS } from '../content/tool-icons';

/** Ícono decorativo de una herramienta; no pinta nada si no hay ícono para ese nombre. */
@Component({
  selector: 'app-tool-icon',
  template: `
    @if (icon(); as icon) {
      @if (icon.path) {
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <svg:path [attr.d]="icon.path" />
        </svg>
      } @else {
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          @for (node of icon.nodes; track $index) {
            @let a = node[1];
            @switch (node[0]) {
              @case ('path') { <svg:path [attr.d]="a['d']" /> }
              @case ('circle') { <svg:circle [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.r]="a['r']" /> }
              @case ('ellipse') { <svg:ellipse [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" /> }
              @case ('rect') {
                <svg:rect [attr.x]="a['x']" [attr.y]="a['y']" [attr.width]="a['width']" [attr.height]="a['height']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" />
              }
              @case ('line') { <svg:line [attr.x1]="a['x1']" [attr.y1]="a['y1']" [attr.x2]="a['x2']" [attr.y2]="a['y2']" /> }
              @case ('polyline') { <svg:polyline [attr.points]="a['points']" /> }
              @case ('polygon') { <svg:polygon [attr.points]="a['points']" /> }
            }
          }
        </svg>
      }
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      color: var(--cielo);
      transition: color 0.2s;
    }

    svg {
      display: block;
      width: 14px;
      height: 14px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--brand]': 'icon()?.color ?? null' },
})
export class ToolIcon {
  readonly tool = input.required<string>();
  protected readonly icon = computed(() => TOOL_ICONS[this.tool()] ?? null);
}
