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

export type ResourceCategory = 'fahrzeug' | 'geraet';

export interface Bus {
  id: number;
  name: string;
  category: ResourceCategory;
  licensePlate: string | null;
  seats: number | null;
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
