import { ChangeDetectionStrategy, Component } from '@angular/core';
import { STACK } from '../content/cv';
import { ToolIcon } from './tool-icon';

@Component({
  selector: 'app-stack',
  imports: [ToolIcon],
  templateUrl: './stack.html',
  styleUrl: './stack.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stack {
  protected readonly groups = STACK;
}
