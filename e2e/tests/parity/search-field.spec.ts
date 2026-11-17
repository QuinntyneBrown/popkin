import { NotificationSettingsPage } from '../../pages/notification-settings.page';
import { theMockMutedPeople } from '../../fixtures/notifications';
import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { NewMessageDialog } from '../../pages/new-message.dialog';

parity('search-field', [
  {
    key: 'newMessage',
    ...directMessageStates.newMessage,
    name: 'empty',
    region: (page) => new NewMessageDialog(page).searchField,
    // The mock's field has `autofocus`, so its focus ring shows.
    prepare: (page) => new NewMessageDialog(page).search.focus(),
  },
  {
    key: 'newMessageNoResults',
    ...directMessageStates.newMessageNoResults,
    name: 'typed',
    region: (page) => new NewMessageDialog(page).searchField,
    // The mock's field has `autofocus`, so its focus ring shows.
    prepare: (page) => new NewMessageDialog(page).search.focus(),
  },
  // The field at the top of a popover: "Search people in your Popkins" (L2-160 AC2).
  {
    key: 'notificationSettingsMuteSearch',
    name: 'popover',
    region: (page) => new NotificationSettingsPage(page).pickerSearch,
    before: theMockMutedPeople,
    app: (page) => new NotificationSettingsPage(page).openPicker(),
    snap: true,
  },
]);
