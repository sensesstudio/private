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

// Record a package purchase / payment for a client (prepended, newest first).
export function recordPayment(cId, entry) {
  const cur = getClientProfile(cId) || {};
  saveClientProfile(cId, { payments: [entry, ...(cur.payments || [])] });
}

// Persist the client's current credit balance so the admin sees it.
export function setClientCredits(cId, credits) {
  saveClientProfile(cId, { credits });
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

// Overall "About me" / intake completion across the meaningful fields
// (injury and free-text notes are optional and excluded).
// Returns 'completed' | 'partial' | 'none'.
export function intakeStatus(a = {}) {
  const checks = [
    isDeclarationComplete(a),
    (a.goals || []).length > 0,
    !!a.age,
    !!a.level,
    (a.languages || []).length > 0,
    (a.schedule || []).length > 0,
    !!a.location,
  ];
  const done = checks.filter(Boolean).length;
  if (done === 0) return 'none';
  if (done === checks.length) return 'completed';
  return 'partial';
}
