import { ChangeDetectionStrategy, Component } from '@angular/core';
import { STACK } from '../content/cv';

@Component({
  selector: 'app-stack',
  templateUrl: './stack.html',
  styleUrl: './stack.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stack {
  protected readonly groups = STACK;
}
