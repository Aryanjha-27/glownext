import { useState, useEffect, useCallback } from "react";
import { listServices } from "@/api/serviceApi";

export function useServices(params = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await listServices(params);
      setData(res);
    } catch (err) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { data, isLoading, isError, error, refetch: fetchServices };
}

