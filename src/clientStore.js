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

// Derive current gestational age + trimester from an estimated due date (EDD),
// so the client enters the due date once and never has to update a trimester.
// EDD is an ISO date string (yyyy-mm-dd). Returns null if missing/invalid.
export function pregnancyFromEDD(edd) {
  if (!edd) return null;
  const due = new Date(edd + 'T00:00:00');
  if (isNaN(due.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysToDue = Math.round((due - today) / 86400000);
  const weeks = Math.max(0, Math.min(42, Math.round(40 - daysToDue / 7))); // 40-week term
  const trimester = weeks <= 12 ? '1st trimester' : weeks <= 26 ? '2nd trimester' : '3rd trimester';
  const dueLabel = due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return { weeks, trimester, daysToDue, dueLabel };
}

// The health declaration is complete only when pregnant + surgery are answered,
// an estimated due date is given if pregnant, and a doctor clearance is given
// when the client is either pregnant or post-surgery.
export function isDeclarationComplete(a = {}) {
  if (a.pregnant !== 'yes' && a.pregnant !== 'no') return false;
  if (a.surgery !== 'yes' && a.surgery !== 'no') return false;
  if (a.pregnant === 'yes' && !pregnancyFromEDD(a.edd)) return false;
  if ((a.pregnant === 'yes' || a.surgery === 'yes') && a.doctorClearance !== 'yes' && a.doctorClearance !== 'no') return false;
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
    (Array.isArray(a.location) ? a.location.length > 0 : !!a.location),
  ];
  const done = checks.filter(Boolean).length;
  if (done === 0) return 'none';
  if (done === checks.length) return 'completed';
  return 'partial';
}
