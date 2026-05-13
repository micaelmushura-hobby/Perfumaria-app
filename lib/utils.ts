import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

export const parseNumber = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  let num: number;
  if (typeof val === "number") {
    num = val;
  } else {
    const normalized = String(val).replace(",", ".");
    num = parseFloat(normalized);
  }
  
  if (isNaN(num)) return 0;
  
  // Baserow only accepts 2 decimal places for these fields
  return Math.round(num * 100) / 100;
};
