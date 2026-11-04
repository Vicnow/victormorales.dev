import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ROLES } from '../content/cv';
import { ToolIcon } from './tool-icon';

@Component({
  selector: 'app-experience',
  imports: [ToolIcon],
  templateUrl: './experience.html',
  styleUrl: './experience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Experience {
  protected readonly roles = ROLES;
}
