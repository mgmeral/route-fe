declare module 'countries-cities' {
  /** returns an array of country names */
  export function getCountries(): string[];
  /** returns an array of cities for the given country */
  export function getCities(country: string): string[];
}
