export type Role = 'admin' | 'member';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: Role;
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
}

export interface Bus {
  id: number;
  name: string;
  licensePlate: string;
  seats: number;
  color: string;
  isActive: boolean;
}

export interface Booking {
  id: number;
  busId: number;
  userId: number;
  title: string;
  start: string;
  end: string;
  seriesId: string | null;
  notes: string | null;
  userDisplayName: string;
  busName: string;
  busColor: string;
}

export interface Conflict {
  id: number;
  title: string;
  start: string;
  end: string;
  userDisplayName: string;
}
