import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Environment tag (docs/design-system/components/admin-shell.html): which deployment the console
 * acts on, "Production", with a red dot. The words carry it; the dot is decoration.
 */
@Component({
  selector: 'span[pk-env-tag]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './env-tag.html',
  styleUrl: './env-tag.scss',
  host: { class: 'env-tag' },
})
export class EnvTag {}
