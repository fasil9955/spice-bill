import { useEffect } from 'react';
import { looksLikeScannedBarcode, normalizeBarcode } from '../utils/productLookup';

/** Typical HID scanner inter-key delay is 5–40ms; cheap units can be slower. */
const INTER_KEY_MAX_MS = 90;
/** Commit when the scanner does not send Enter/Tab. */
const IDLE_COMMIT_MS = 160;
const MIN_CHARS = 4;

/**
 * Capture USB/HID wedge barcode scans even when the search box is not focused.
 * Fast key bursts are treated as scans; normal typing is left alone.
 */
export function useHidBarcodeListener({ enabled = true, onScan, isBlocked } = {}) {
  useEffect(() => {
    if (!enabled || typeof onScan !== 'function') return;

    let buffer = '';
    let lastAt = 0;
    let burstCount = 0;
    let idleTimer = null;
    let leakedFirstChar = null;

    const clearIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const stripLeakedChar = () => {
      if (!leakedFirstChar) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && typeof el.value === 'string') {
        if (el.value.endsWith(leakedFirstChar)) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          const next = el.value.slice(0, -leakedFirstChar.length);
          if (nativeSetter) nativeSetter.call(el, next);
          else el.value = next;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      leakedFirstChar = null;
    };

    const commit = () => {
      clearIdle();
      const code = normalizeBarcode(buffer);
      buffer = '';
      burstCount = 0;
      lastAt = 0;
      if (!looksLikeScannedBarcode(code)) {
        leakedFirstChar = null;
        return;
      }
      stripLeakedChar();
      onScan(code);
    };

    const onKeyDown = (e) => {
      if (typeof isBlocked === 'function' && isBlocked()) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.isComposing) return;
      if (e.repeat) return;

      const now = Date.now();
      const gap = lastAt ? now - lastAt : 9999;
      if (gap > INTER_KEY_MAX_MS) {
        buffer = '';
        burstCount = 0;
        leakedFirstChar = null;
      }
      lastAt = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.length >= MIN_CHARS && burstCount >= 3 && looksLikeScannedBarcode(buffer)) {
          e.preventDefault();
          e.stopPropagation();
          commit();
        }
        return;
      }

      if (e.key.length !== 1) return;

      const inBurst = gap > 0 && gap <= INTER_KEY_MAX_MS;
      buffer += e.key;
      burstCount += 1;

      const target = e.target;
      const isSearch = !!(target && target.getAttribute && target.getAttribute('data-barcode-target') === 'true');

      // Swallow scanner keys after the first so they do not land in Customer / qty / payment fields.
      if (!isSearch && (inBurst || burstCount >= 3)) {
        e.preventDefault();
        e.stopPropagation();
      } else if (!isSearch && burstCount === 1) {
        leakedFirstChar = e.key;
      }

      clearIdle();
      idleTimer = setTimeout(() => {
        if (buffer.length >= MIN_CHARS && burstCount >= 4 && looksLikeScannedBarcode(buffer)) {
          commit();
        } else {
          buffer = '';
          burstCount = 0;
          leakedFirstChar = null;
        }
      }, IDLE_COMMIT_MS);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      clearIdle();
    };
  }, [enabled, onScan, isBlocked]);
}
