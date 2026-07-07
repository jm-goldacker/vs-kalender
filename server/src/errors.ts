import type { ConflictRow } from './services/conflicts';

export class ConflictError extends Error {
  constructor(public conflicts: ConflictRow[]) {
    super('Buchungskonflikt');
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
