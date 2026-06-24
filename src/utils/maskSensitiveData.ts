export function maskSensitiveData(data: any): any {
  if (!data) return data;

  const result: any = Array.isArray(data) ? [] : {};

  for (const key in data) {
    const value = data[key];

    if (key === "password") {
      result[key] = "******";
    } else if (key === "iban") {
      result[key] = value ? "******" + value.slice(-4) : value;
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskSensitiveData(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}