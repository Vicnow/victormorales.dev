import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Hero } from '../hero/hero';
import { Contact } from '../sections/contact';
import { Credentials } from '../sections/credentials';
import { Experience } from '../sections/experience';
import { Stack } from '../sections/stack';

// Primero el hero 3D; al hacer scroll, el CV de siempre.
@Component({
  selector: 'app-home',
  imports: [Hero, Experience, Stack, Credentials, Contact],
  template: `
    <app-hero />
    <app-experience />
    <app-stack />
    <app-credentials />
    <app-contact />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
