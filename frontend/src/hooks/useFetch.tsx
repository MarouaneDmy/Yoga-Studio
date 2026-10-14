import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import { authService } from "../services/auth.service";

interface UseFetchOptions {
  url: string;
  dependencies?: any[]; // Tableau de dépendances pour déclencher le re-fetch
}

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export function useFetch<T>({
  url,
  dependencies = [],
}: UseFetchOptions): UseFetchReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const token = authService.getToken();

  const controllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setLoading(true);
      setError("");

      const response = await api.get<T>(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      setData(response.data);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.name === "CanceledError" || err.name === "AbortError")
      ) {
        return;
      }
      setError("Failed to fetch data");
      console.error(err);
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [url, token]);

  useEffect(() => {
    fetchData();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [...dependencies, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
