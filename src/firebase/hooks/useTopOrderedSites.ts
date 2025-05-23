import { useEffect, useState } from 'react';
import { getTop10OrderedSites } from '../services/orderService';
import { FirebaseError } from '../types';

interface SiteOrderCount {
  site: string;
  count: number;
}

export const useTopOrderedSites = () => {
  const [topSites, setTopSites] = useState<SiteOrderCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirebaseError | null>(null);

  useEffect(() => {
    const fetchTopSites = async () => {
      try {
        const sites = await getTop10OrderedSites();
        setTopSites(sites);
      } catch (err) {
        setError(err as FirebaseError);
      } finally {
        setLoading(false);
      }
    };

    fetchTopSites();
  }, []);

  return { topSites, loading, error };
}; 