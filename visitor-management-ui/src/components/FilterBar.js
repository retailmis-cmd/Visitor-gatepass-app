import React from 'react';

const FilterBar = ({ locationFilter, setLocationFilter }) => {
  return (
    <div>
      <select
        value={locationFilter}
        onChange={(e) => setLocationFilter(e.target.value)}
      >
        <option value="All">All</option>
        <option value="Office">Office</option>
        <option value="Warehouse">Warehouse</option>
        <option value="Gate">Gate</option>
      </select>
    </div>
  );
};

export default FilterBar;