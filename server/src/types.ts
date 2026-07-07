export type Role = 'admin' | 'member';

export interface UserDto {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
}

export interface BusDto {
  id: number;
  name: string;
  licensePlate: string;
  seats: number;
  color: string;
  isActive: boolean;
}

export interface BookingDto {
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

export interface ConflictDto {
  id: number;
  title: string;
  start: string;
  end: string;
  userDisplayName: string;
}
