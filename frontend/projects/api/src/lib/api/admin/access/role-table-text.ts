/** A line of "What each role can do", in the wording of the L2-086 table, keyed by the API's row. */
export interface PermissionLine {
  group: string;
  label: string;
  row: string;
}

export const PERMISSION_LINES: readonly PermissionLine[] = [
  { group: 'People', label: 'Find and view people', row: 'View' },
  { group: 'People', label: 'Suspend and restore', row: 'HelpPeople' },
  { group: 'People', label: 'Sign a person out', row: 'HelpPeople' },
  { group: 'People', label: 'Start account deletion', row: 'Deletion' },
  { group: 'People', label: 'Export a person’s data', row: 'HelpPeople' },
  { group: 'Popkins', label: 'Find and view Popkins', row: 'View' },
  { group: 'Popkins', label: 'Wrap up, extend, remove members, reset invites', row: 'HelpPopkins' },
  { group: 'Popkins', label: 'Review reports and remove content', row: 'Moderation' },
  { group: 'Popkins', label: 'End live calls', row: 'Calls' },
  { group: 'Operations', label: 'Run jobs and retry exports', row: 'Operations' },
  { group: 'Platform', label: 'Switch and roll out features', row: 'Platform' },
  { group: 'Platform', label: 'Change limits', row: 'Platform' },
  { group: 'Platform', label: 'Publish announcements', row: 'Platform' },
  {
    group: 'Platform',
    label: 'Pause email, switch kinds and change defaults',
    row: 'Notifications',
  },
  { group: 'Platform', label: 'Hold and release notifications', row: 'NotificationHolds' },
  { group: 'Access', label: 'Add, remove and change admins', row: 'Admins' },
];
