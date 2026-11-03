import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CERTIFICATIONS, EDUCATION, LANGUAGES } from '../content/cv';

@Component({
  selector: 'app-credentials',
  templateUrl: './credentials.html',
  styleUrl: './credentials.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Credentials {
  protected readonly certifications = CERTIFICATIONS;
  protected readonly education = EDUCATION;
  protected readonly languages = LANGUAGES;
}
