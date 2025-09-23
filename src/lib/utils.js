import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

const ENV = import.meta.env;

export function clog(...args) {
    if (ENV.NODE_ENV !== 'production' || ENV.DEBUG) {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
};

export function cerror(...args) {
    if (ENV.NODE_ENV !== 'production' || ENV.DEBUG) {
        // eslint-disable-next-line no-console
        console.error(...args);
    }
}
