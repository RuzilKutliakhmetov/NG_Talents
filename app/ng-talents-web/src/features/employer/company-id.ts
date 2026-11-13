"use client";

import { useSyncExternalStore } from "react";

const COMPANY_ID_EVENT = "ng-talents:company-id";

function storageKey(userId: string) {
  return `ng-talents:employer-id:${userId}`;
}

function notifyCompanyIdChange() {
  window.dispatchEvent(new Event(COMPANY_ID_EVENT));
}

export function saveEmployerId(userId: string, employerId: string) {
  window.localStorage.setItem(storageKey(userId), employerId);
  notifyCompanyIdChange();
}

export function clearEmployerId(userId: string) {
  window.localStorage.removeItem(storageKey(userId));
  notifyCompanyIdChange();
}

export function useEmployerId(userId: string | undefined) {
  const subscribe = (callback: () => void) => {
    if (!userId) return () => undefined;
    window.addEventListener(COMPANY_ID_EVENT, callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener(COMPANY_ID_EVENT, callback);
      window.removeEventListener("storage", callback);
    };
  };
  const getSnapshot = () =>
    userId ? window.localStorage.getItem(storageKey(userId)) : null;

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
