import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ROLES } from '../content/cv';

@Component({
  selector: 'app-experience',
  templateUrl: './experience.html',
  styleUrl: './experience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Experience {
  protected readonly roles = ROLES;
}
