import React from 'react';
import VisitorList from './components/VisitorList';
import VisitorForm from './components/VisitorForm';
import FilterBar from './components/FilterBar';
import './styles/App.css';

function App() {
  const [refresh, setRefresh] = React.useState(false);

  const handleRefresh = () => {
    setRefresh(prev => !prev);
  };

  return (
    <div className="App">
      <h1>Visitor Management System</h1>
      <FilterBar onRefresh={handleRefresh} />
      <VisitorForm onRefresh={handleRefresh} />
      <VisitorList refresh={refresh} />
    </div>
  );
}

export default App;