/**
 * useOfflineQueue – buffers emergency report submissions when offline
 * and flushes them when connectivity returns.
 *
 * Usage:
 *   const { enqueue, pendingCount } = useOfflineQueue();
 *   enqueue(reportPayload);   // call instead of direct submitReport when offline
 */

import { useEffect, useState, useCallback } from 'react';
import { submitReport } from '@/lib/api';
import { toast } from 'sonner';
import type { EmergencyType, SeverityLevel } from '@/types/index';

const IDB_DB   = 'ldrrmo-offline';
const IDB_STORE = 'offline-reports';
const IDB_VER  = 1;

type ReportPayload = {
  emergency_type: EmergencyType;
  severity: SeverityLevel;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string;
  photo_url: string | null;
};

// ── minimal IndexedDB helpers ──────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, IDB_VER);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

async function idbGetAll(): Promise<{ id: number; payload: ReportPayload }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbAdd(payload: ReportPayload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).add({ payload });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function idbDelete(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function idbCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).count();
    req.onsuccess = () => resolve(req.result as number);
    req.onerror   = () => reject(req.error);
  });
}

// ── hook ──────────────────────────────────────────────────────────────────
export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refreshCount = useCallback(async () => {
    const n = await idbCount();
    setPendingCount(n);
  }, []);

  const enqueue = useCallback(async (payload: ReportPayload) => {
    await idbAdd(payload);
    await refreshCount();
    toast.info('Report saved offline. Will sync when connected.');
    // Register background sync if the browser supports it
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('sync-reports').catch(() => {});
    }
  }, [refreshCount]);

  const flush = useCallback(async () => {
    if (flushing) return;
    const records = await idbGetAll();
    if (records.length === 0) return;
    setFlushing(true);
    let synced = 0;
    for (const record of records) {
      const { error } = await submitReport(record.payload);
      if (!error) {
        await idbDelete(record.id);
        synced++;
      }
    }
    setFlushing(false);
    await refreshCount();
    if (synced > 0) toast.success(`${synced} offline report${synced > 1 ? 's' : ''} synced.`);
  }, [flushing, refreshCount]);

  // Flush when the app regains connectivity
  useEffect(() => {
    refreshCount();
    const handler = () => { flush(); };
    window.addEventListener('online', handler);
    // Also try to flush immediately if already online
    if (navigator.onLine) flush();
    return () => window.removeEventListener('online', handler);
  }, [flush, refreshCount]);

  return { enqueue, flush, pendingCount, flushing };
}
