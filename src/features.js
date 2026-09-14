// Real data is the default. Demo data requires an explicit development setting;
// missing credentials or empty tables must never invent availability.
export const LIVE_AVAILABILITY = import.meta.env?.VITE_LIVE_AVAILABILITY !== 'false';
