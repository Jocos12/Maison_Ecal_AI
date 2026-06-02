import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useOpportunities(params) {
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get('/api/opportunities', { params });
      setData({
        items: res.data,
        total: res.total,
        pages: res.pages,
        page: res.page
      });
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, reload: load };
}
