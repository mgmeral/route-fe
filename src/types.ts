export type Role = 'ADMIN' | 'USER' | 'AGENCY';

export interface User {
  username: string;
  role: Role;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  country: string;
  city: string;
}

export interface Transportation {
  id: string;
  origin?: Location;
  destination?: Location;
  type?: string;
  operatingDaysMask?: number;
  [key: string]: unknown;
}

export interface LocationCreateRequest {
  code: string;
  name: string;
  country: string;
  city: string;
}

export interface RouteSegmentResponse {
  [key: string]: unknown;
}

export interface RouteResponse {
  from: string;
  to: string;
  date: string;
  segments: RouteSegmentResponse[];
}

export interface NormalizedSegment {
  transportLabel: string;
  locationLabel: string;
}
