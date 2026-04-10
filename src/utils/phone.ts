export function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('233') && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }

  if (!digits.startsWith('0') && digits.length === 9) {
    return `0${digits}`;
  }

  return digits;
}

export function phoneLookupKey(value: string) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return '';

  const digits = normalized.replace(/\D/g, '');
  if (digits.length >= 9) {
    return digits.slice(-9);
  }

  return digits;
}

export function normalizeFullName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
