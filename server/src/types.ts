export type Role = 'admin' | 'member';

export interface UserDto {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
}

export type ResourceCategory = 'fahrzeug' | 'geraet';

export interface BusDto {
  id: number;
  name: string;
  category: ResourceCategory;
  licensePlate: string | null;
  seats: number | null;
  quantity: number | null;
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
  quantity: number;
  userDisplayName: string;
  busName: string;
  busColor: string;
  busQuantity: number | null;
}

export interface ConflictDto {
  id: number;
  title: string;
  start: string;
  end: string;
  userDisplayName: string;
}
