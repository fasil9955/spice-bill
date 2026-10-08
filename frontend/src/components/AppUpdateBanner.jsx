import React, { useEffect, useState } from 'react';
import { appUpdateService } from '../services/api';

const AppUpdateBanner = () => {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      const res = await appUpdateService.status();
      setInfo(res.data || null);
      return res.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('updatePreview') === '1') {
      setInfo({
        updateAvailable: true,
        uiPreview: true,
        latestVersion: '99.0.0',
        currentVersion: '1.1.0',
      });
      return undefined;
    }
    refresh();
    const id = setInterval(refresh, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const visible = open && (info?.updateAvailable || info?.updateReady);
  if (!visible) return null;

  const runUpdate = async () => {
    if (!window.confirm('Finish any open bill first. Billing will download the new version, close, and start again. Continue?')) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!info?.updateReady && !info?.uiPreview) {
        await appUpdateService.download();
      }
      const res = await appUpdateService.restart();
      if (res.data?.preview) {
        setError(res.data.message || 'Preview OK. No restart (this is a test).');
        setBusy(false);
        return;
      }
      setError('Restarting… Wait a few seconds, then refresh this page.');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed. Check internet and try again.');
      setBusy(false);
    }
  };

  return (
    <aside className={`app-update-slide ${open ? 'in' : ''}`} aria-live="polite">
      <button type="button" className="app-update-slide-close" onClick={() => setOpen(false)} aria-label="Hide">
        ×
      </button>
      <p className="app-update-slide-kicker">Update available</p>
      <h3>Version {info.latestVersion || ''}</h3>
      <p>You are on {info.currentVersion || 'this version'}. Click Update only when the counter is free.</p>
      {error ? <p className="app-update-error">{error}</p> : null}
      <button type="button" className="app-update-slide-go" disabled={busy} onClick={runUpdate}>
        {busy ? 'Updating…' : 'Update'}
      </button>
    </aside>
  );
};

export default AppUpdateBanner;
