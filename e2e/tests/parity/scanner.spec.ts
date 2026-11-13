import { scanAPopkinAndWait, openTheScanner, withACamera } from '../../fixtures/my-popkins';
import { parity } from '../../fixtures/parity';
import { ScanToJoinDialog } from '../../pages/scan-to-join.dialog';

// The mock draws no camera picture: the view is compared while the browser still asks for the
// camera, and once a code was found, when the picture is gone.
parity('scanner', [
  {
    key: 'scanToJoin',
    name: 'frame',
    region: (page) => new ScanToJoinDialog(page).scanner,
    before: withACamera('asking'),
    app: openTheScanner,
  },
  {
    key: 'scanToJoinBusy',
    name: 'found',
    region: (page) => new ScanToJoinDialog(page).hint,
    before: withACamera('allowed'),
    app: scanAPopkinAndWait,
  },
]);
