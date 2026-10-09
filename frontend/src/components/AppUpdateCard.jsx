import React, { useState } from 'react';
import { appUpdateService } from '../services/api';

const AppUpdateCard = () => {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    setError('');
    try {
      const res = await appUpdateService.status();
      setInfo(res.data || null);
    } catch (err) {
      setInfo(null);
      setError(err.response?.data?.error || err.message || 'Could not reach the update API. This JAR may be too old.');
    } finally {
      setChecking(false);
    }
  };

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
        setError(res.data.message || 'Preview only — JAR was not replaced.');
        setBusy(false);
        return;
      }
      setError('Restarting… Wait a few seconds, then refresh this page.');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed. Check internet and logs/spices-billing.log');
      setBusy(false);
    }
  };

  return (
    <div className="app-update-card">
      <div className="app-update-card-head">
        <div>
          <h3>Check for updates</h3>
          <p>Compares this shop’s JAR with GitHub. Details also go into logs/spices-billing.log</p>
        </div>
        <button type="button" className="app-update-card-check" onClick={check} disabled={checking || busy}>
          {checking ? 'Checking…' : 'Check for updates'}
        </button>
      </div>
      {error ? <p className="app-update-card-error">{error}</p> : null}
      {info && (
        <div className="app-update-card-result">
          <p><strong>This PC:</strong> {info.currentVersion || '—'}</p>
          <p><strong>GitHub:</strong> {info.latestVersion || '—'}</p>
          <p><strong>Status:</strong> {info.message || '—'}</p>
          <p><strong>Running from JAR:</strong> {info.runningFromJar ? 'yes' : 'no'}</p>
          {info.jarPath ? <p className="app-update-card-path">{info.jarPath}</p> : null}
          {info.updateAvailable ? (
            <button type="button" className="app-update-card-go" disabled={busy} onClick={runUpdate}>
              {busy ? 'Updating…' : 'Install update'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AppUpdateCard;
