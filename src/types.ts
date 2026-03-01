export type Role = 'ADMIN' | 'USER';

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
  name: string;
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
