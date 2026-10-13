import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppUpdateCard from '../components/AppUpdateCard';
import ProblemReportCard from '../components/ProblemReportCard';

const UtilitiesPage = () => {
  const navigate = useNavigate();
  return (
    <div className="bills-container">
      <div className="bills-header">
        <div>
          <h1>🧰 Utilities</h1>
          <p>Check for updates and report a problem</p>
        </div>
        <div className="bills-header-actions">
          <button type="button" className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </div>
      <div className="utilities-page-grid">
        <AppUpdateCard />
        <ProblemReportCard />
      </div>
    </div>
  );
};

export default UtilitiesPage;
