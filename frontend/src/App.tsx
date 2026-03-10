import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import LoginPage from './components/LoginPage'
import './App.css'
import SignupPage from './components/SignupPage'
import CreateEvent from './components/CreateEvent'
import Dashboard from './components/Dashboard'

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<Dashboard />} /> {/* Placeholder for now */}
        <Route path="/create-event" element={<CreateEvent />} />
      </Routes>
    </Router>
  )
}

export default App
