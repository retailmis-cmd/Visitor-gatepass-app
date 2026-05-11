import React, { useState } from 'react';

const API_URL = "http://localhost:5000"; // Adjust as necessary

export default function VisitorForm({ onVisitorAdded }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('Office');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name) {
      setError('Name is required');
      return;
    }

    const newVisitor = { name, company, location };

    try {
      const res = await fetch(`${API_URL}/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVisitor),
      });

      if (!res.ok) {
        throw new Error('Failed to add visitor');
      }

      const data = await res.json();
      onVisitorAdded(data); // Notify parent component
      setName('');
      setCompany('');
      setLocation('Office');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Add Visitor</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Company:</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div>
          <label>Location:</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="Office">Office</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Gate">Gate</option>
          </select>
        </div>
        <button type="submit">Add Visitor</button>
      </form>
    </div>
  );
}