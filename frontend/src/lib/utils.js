/**
 * Lightweight `cn` helper that accepts strings, arrays and objects.
 * Falls back to a simple implementation so this file works without extra deps.
 */
export function cn(...args) {
  const res = [];
  const add = (val) => {
    if (!val && val !== 0) return;
    if (typeof val === "string" || typeof val === "number") return res.push(String(val));
    if (Array.isArray(val)) return val.forEach(add);
    if (typeof val === "object") {
      for (const k in val) if (Object.prototype.hasOwnProperty.call(val, k) && val[k]) res.push(k);
    }
  };
  args.forEach(add);
  return res.join(" ");
}

export default cn;
