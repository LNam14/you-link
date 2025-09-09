import { useState, useEffect } from 'react';
import sheetApiRequest from '@/apiRequests/sheet';
import { CongNo } from '@/apiRequests/sheet';

interface UseCongNoReturn {
  congNoData: CongNo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCongNo = (): UseCongNoReturn => {
  const [congNoData, setCongNoData] = useState<CongNo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCongNo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response:any = await sheetApiRequest.getCongNo();
      setCongNoData(response.content || []);
    } catch (err: any) {
      console.error('Error fetching cong no data:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu công nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCongNo();
  }, []);

  return {
    congNoData,
    loading,
    error,
    refetch: fetchCongNo,
  };
};
