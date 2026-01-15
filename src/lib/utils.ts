// src/lib/utils.ts

import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: (string | undefined | false | null)[]) {
    return inputs.filter(Boolean).join(" ");
  }