"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced version of a value.
 * The value only updates after the specified delay has elapsed
 * without any further changes.
 */
export function useDebounce<T>(value: T, delay = 500): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [value, delay]);

    return debouncedValue;
}