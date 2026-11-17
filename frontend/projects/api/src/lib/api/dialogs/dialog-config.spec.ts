import { describe, expect, it } from 'vitest';
import { dialogConfig } from './dialog-config';

describe('dialogConfig', () => {
  it('names the dialog by its pk-dialog title, leaves the backdrop to pk-dialog and is modal', () => {
    expect(dialogConfig()).toEqual({
      ariaLabelledBy: 'dlg-title',
      hasBackdrop: false,
      ariaModal: true,
    });
  });

  it.each([
    ['ariaLabelledBy', 'delete-story-title'],
    ['hasBackdrop', true],
    ['ariaModal', false],
  ] as const)('lets a dialog choose its own %s', (option, value) => {
    expect(dialogConfig({ [option]: value })[option]).toBe(value);
  });

  it('passes a dialog’s own data, description and focus through unchanged', () => {
    const opener = document.createElement('button');
    const data = { popkinId: 'p1', accent: 'coral' };

    expect(
      dialogConfig({
        data,
        ariaDescribedBy: 'dlg-desc',
        autoFocus: '#pname',
        restoreFocus: opener,
      }),
    ).toEqual({
      ariaLabelledBy: 'dlg-title',
      hasBackdrop: false,
      ariaModal: true,
      data,
      ariaDescribedBy: 'dlg-desc',
      autoFocus: '#pname',
      restoreFocus: opener,
    });
  });

  it('gives each dialog a config of its own', () => {
    const first = dialogConfig();
    first.ariaLabelledBy = 'changed';

    expect(dialogConfig().ariaLabelledBy).toBe('dlg-title');
  });
});
