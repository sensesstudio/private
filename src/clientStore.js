// Senses Pilates — shared client-record store
//
// Holds the latest client-submitted profile/intake answers (health declaration,
// goals, preferences) keyed by client id, with pub/sub so the admin portal sees
// the most up-to-date record the moment a client saves it. Mirrors the live
// progress store; swap for API reads/writes when the backend lands.

import { useState, useEffect } from 'react';

const store = {}; // cId -> saved answers
const listeners = new Set();

export function saveClientProfile(cId, data) {
  store[cId] = { ...(store[cId] || {}), ...data };
  listeners.forEach((fn) => fn());
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('clientstorechange'));
}

export function getClientProfile(cId) {
  return store[cId] || null;
}

// Subscribe a component to any change in the client store.
export function useClientStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return store;
}

// The health declaration is complete only when pregnant + surgery are answered,
// a trimester is chosen if pregnant, and a doctor clearance is given when the
// client is both pregnant and post-surgery.
export function isDeclarationComplete(a = {}) {
  if (a.pregnant !== 'yes' && a.pregnant !== 'no') return false;
  if (a.surgery !== 'yes' && a.surgery !== 'no') return false;
  if (a.pregnant === 'yes' && !a.pregnancyWeeks) return false;
  if (a.pregnant === 'yes' && a.surgery === 'yes' && a.doctorClearance !== 'yes' && a.doctorClearance !== 'no') return false;
  return true;
}
