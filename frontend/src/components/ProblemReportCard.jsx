import React, { useState } from 'react';
import { appUpdateService } from '../services/api';

const ProblemReportCard = ({ embedded = false }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const send = async () => {
    setError('');
    setMessage('');
    const text = note.trim();
    if (text.length < 8) {
      setError('Write what happened (screen, bill number, what you clicked).');
      return;
    }
    setBusy(true);
    try {
      const res = await appUpdateService.reportProblem(text);
      setMessage(res.data?.message || 'Report sent.');
      setNote('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send. Check internet, or WhatsApp the owner with a photo of the screen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={embedded ? 'utilities-section' : 'problem-report-card'}>
      <h3>Report a problem</h3>
      <p>Sends a note to the owner by email, plus app version and recent log lines. Does not send passwords.</p>
      <textarea
        className="problem-report-note"
        rows={3}
        maxLength={2000}
        placeholder="e.g. Debit note payment hidden, invoice BVT/54, around 2pm"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={busy}
      />
      <button type="button" className="problem-report-send" onClick={send} disabled={busy}>
        {busy ? 'Sending…' : 'Send to owner'}
      </button>
      {error ? <p className="problem-report-error">{error}</p> : null}
      {message ? <p className="problem-report-ok">{message}</p> : null}
    </div>
  );
};

export default ProblemReportCard;
