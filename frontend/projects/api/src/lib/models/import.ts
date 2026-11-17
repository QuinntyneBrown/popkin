import { PopkinColour } from './popkin';

/** Someone the person shares a Popkin with, as Import lists them (L2-151 AC1). */
export interface ImportPersonView {
  personId: string;
  name: string;
  initials: string;
  accent: PopkinColour;
  photoUrl: string | null;
}

/** A Popkin the person is in, with its people A to Z (L2-151 AC1, AC6). */
export interface ImportPopkinView {
  popkinId: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  peopleCount: number;
  people: ImportPersonView[];
}

/** Everyone to import, counted once each (L2-151 AC2). */
export interface ImportCandidatesView {
  total: number;
  popkins: ImportPopkinView[];
}

export interface ImportContactsRequest {
  clientId: string;
  personIds: string[];
}

export interface ImportResultView {
  imported: number;
}
