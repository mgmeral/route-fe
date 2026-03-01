import type { Location, RouteResponse, Transportation } from '../types';

export const mockLocations: Location[] = [
  { id: '1', code: 'TKS', name: 'Taksim Square', country: 'Turkey', city: 'Istanbul' },
  { id: '2', code: 'IST', name: 'Istanbul Airport', country: 'Turkey', city: 'Istanbul' },
  { id: '3', code: 'SAW', name: 'Sabiha Gökçen Airport', country: 'Turkey', city: 'Istanbul' },
  { id: '4', code: 'YEI', name: 'Bursa Yenişehir Airport', country: 'Turkey', city: 'Bursa' },
  { id: '5', code: 'LHR', name: 'London Heathrow Airport', country: 'United Kingdom', city: 'London' },
  { id: '6', code: 'WMB', name: 'Wembley Stadium', country: 'United Kingdom', city: 'London' }
];

export const mockTransportations: Transportation[] = [
  { id: '1', name: 'Bus' },
  { id: '2', name: 'Flight' },
  { id: '3', name: 'Uber' }
];

export const mockRoutes: RouteResponse[] = [
  {
    from: 'Taksim Square',
    to: 'Wembley Stadium',
    date: '2026-01-01',
    segments: [
      { transportationName: 'Bus', to: 'Istanbul Airport (IST)' },
      { transportationName: 'Flight', to: 'London Heathrow Airport (LHR)' },
      { transportationName: 'Uber', to: 'Wembley Stadium' }
    ]
  },
  {
    from: 'Taksim Square',
    to: 'Wembley Stadium',
    date: '2026-01-01',
    segments: [
      { transportationName: 'Bus', to: 'Sabiha Gökçen Airport (SAW)' },
      { transportationName: 'Flight', to: 'London Heathrow Airport (LHR)' },
      { transportationName: 'Uber', to: 'Wembley Stadium' }
    ]
  },
  {
    from: 'Taksim Square',
    to: 'Wembley Stadium',
    date: '2026-01-01',
    segments: [
      { transportationName: 'Bus', to: 'Bursa Yenişehir Airport (YEI)' },
      { transportationName: 'Flight', to: 'London Heathrow Airport (LHR)' },
      { transportationName: 'Uber', to: 'Wembley Stadium' }
    ]
  }
];
