import { API_URL } from '../config';

export const fetchVisitors = async () => {
  const response = await fetch(`${API_URL}/visitors`);
  if (!response.ok) {
    throw new Error('Failed to fetch visitors');
  }
  return response.json();
};

export const deleteVisitor = async (id) => {
  const response = await fetch(`${API_URL}/visitors/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete visitor');
  }
  return response.json();
};