import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CONTACT } from '../content/cv';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  protected readonly contact = CONTACT;
}
