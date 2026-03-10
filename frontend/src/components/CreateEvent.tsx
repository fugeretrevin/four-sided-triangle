import React, { useState, type FormEvent } from 'react';
import { db, auth } from '../firebaseConfig'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const pushEvent = async (eventData: any) => {
  try {
    // goes to events collection in firestore
    const colRef = collection(db, 'events');

    // adds document to collection with event data and connects it to the current user
    await addDoc(colRef, {
      ...eventData,
      hostId: auth.currentUser?.uid, 
      createdAt: serverTimestamp()   
    });
  } catch (error) {
    console.error("Error pushing event:", error);
  }
};
const CreateEvent: React.FC = () => {
    const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState(''); 

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
  
    if (!auth.currentUser) {
        alert("You must be logged in to host an event");
        navigate('/login');
        return;
  }
    try {
      // go to events collection
      const eventsCol = collection(db, 'events');

      // document is created for the user to fill out is based on the event schema in firebase
      await addDoc(eventsCol, {
        name,
        description,
        location,
        dateTime: new Date(dateTime), // converts string to javascript date object
        rsvpCount: 0,                 
        hostId: auth.currentUser?.uid || 'anonymous', // should use the real auth UID
        hostName: auth.currentUser?.displayName || 'Placeholder Host',
        createdAt: serverTimestamp()  
      });
      await pushEvent({name, description, location, dateTime: new Date(dateTime)});
      alert("Event created successfully!");
      // reset form
      setName(''); setDescription(''); setLocation(''); setDateTime('');
      navigate('/dashboard'); // redirect to dashboard after creation
    } catch (err) {
      console.error("Error adding event: ", err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Event</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Event Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Date & Time</label>
            <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Location</label>
            <input type="text" placeholder="e.g. Norman Hall" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <button type="submit" className="auth-button">Publish Event</button>
        </form>
      </div>
    </div>
  );
};


export default CreateEvent;