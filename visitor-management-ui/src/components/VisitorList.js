import React, { useState, useEffect } from 'react';

const API_URL = "http://localhost:5000";

export default function VisitorList({ refresh }) {
  const [visitors, setVisitors] = useState([]);
  const [locationFilter, setLocationFilter] = useState('All');

  const fetchVisitors = async () => {
    try {
      const res = await fetch(`${API_URL}/visitors`);
      const data = await res.json();
      setVisitors(data);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Cannot connect to backend");
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [refresh]);

  const deleteVisitor = async (id) => {
    try {
      const deleteUrl = `${API_URL}/visitors/${id}`;
      console.log("DELETE CALL:", deleteUrl);

      const res = await fetch(deleteUrl, {
        method: 'DELETE'
      });

      const data = await res.json();
      console.log("RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      setVisitors(prev => prev.filter(v => v.id !== id));

    } catch (err) {
      console.error("DELETE ERROR:", err);
      alert("Delete failed: " + err.message);
    }
  };

  const filteredVisitors =
    locationFilter === 'All'
      ? visitors
      : visitors.filter(v => v.location === locationFilter);

  return (
    <div>
      <h2>Visitors ({filteredVisitors.length})</h2>

      <select
        value={locationFilter}
        onChange={(e) => setLocationFilter(e.target.value)}
      >
        <option value="All">All</option>
        <option value="Office">Office</option>
        <option value="Warehouse">Warehouse</option>
        <option value="Gate">Gate</option>
      </select>

      <table border="1">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Location</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredVisitors.map(v => (
            <tr key={v.id}>
              <td>{v.name}</td>
              <td>{v.company || '-'}</td>
              <td>{v.location || '-'}</td>
              <td>
                <button onClick={() => deleteVisitor(v.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}