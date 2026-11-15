import { describe, expect, it } from 'vitest';
import { actionBlockedReason } from './admin-permissions';

describe('actionBlockedReason', () => {
  it.each([
    ['Owner', ['ManageAdmins'], null],
    ['Support', ['SuspendPerson'], 'Only Owners can do this'],
    ['Viewer', ['ExportAuditLog'], 'Viewer admins can’t do this'],
  ] as const)('answers a %s', (role, allowed, reason) => {
    expect(actionBlockedReason(role, allowed, 'ManageAdmins')).toBe(reason);
  });

  it('allows what the role allows, whatever the role', () => {
    expect(actionBlockedReason('Viewer', ['ExportAuditLog'], 'ExportAuditLog')).toBeNull();
  });
});
