// src/components/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react'; // Great for "Create" buttons

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Upcoming Events</h1>
        <button 
          className="create-btn" 
          onClick={() => navigate('/create-event')}
        >
          <PlusCircle size={20} style={{ marginRight: '8px' }} />
          Create New Event
        </button>
      </header>
      
      {/* List of events should go here*/}
      <div className="event-list">
        <p>No events found</p>
      </div>
    </div>
  );
};

export default Dashboard;