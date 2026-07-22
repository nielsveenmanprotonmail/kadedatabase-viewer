"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

// Module-level store: survives client-side navigatie (tabwissel),
// reset bij volledige page reload.
const store = new Map<string, unknown>();

export function useSessionState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    store.has(key) ? (store.get(key) as T) : initial
  );

  const setAndStore = useCallback<Dispatch<SetStateAction<T>>>(
    (update) => {
      setValue((prev) => {
        const next = update instanceof Function ? update(prev) : update;
        store.set(key, next);
        return next;
      });
    },
    [key]
  );

  return [value, setAndStore];
}
