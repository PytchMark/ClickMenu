const Formatters = (() => {
  const money = (value, currency = "USD") => {
    if (value === null || value === undefined || value === "") return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const dateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleString();
  };

  return {
    money,
    dateTime,
  };
})();
