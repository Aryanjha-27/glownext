function formatPrice(value) {
  if (value === null || value === void 0 || value === "") return "\u2014";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  return `Rs. ${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
export { formatPrice };
