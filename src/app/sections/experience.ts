import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ROLES } from '../content/cv';
import { Metrics } from './metrics';
import { ToolIcon } from './tool-icon';

@Component({
  selector: 'app-experience',
  imports: [Metrics, ToolIcon],
  templateUrl: './experience.html',
  styleUrl: './experience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Experience {
  protected readonly roles = ROLES;
}
