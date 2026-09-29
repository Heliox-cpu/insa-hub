const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /otp/i,
  /totp/i,
  /mfa/i,
  /credential/i,
  /authorization/i,
  /cookie/i,
  /castgc/i,
  /jsessionid/i,
  /auth_session_id/i,
];

/**
 * Recursively redacts sensitive values from an object, array, or primitive.
 */
export function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes URLs that may contain sensitive query parameters or ADE token secrets.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost');
    const params = parsed.searchParams;
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        params.set(key, '[REDACTED]');
      } else {
        let val = params.get(key) || '';
        val = val.replace(/(~[^!:]+![0-9]+:)[a-zA-Z0-9_-]+/g, '$1[REDACTED]');
        params.set(key, val);
      }
    }
    // Also mask ADE URL tokens matching ~<LOGIN>!<YEAR>:<TOKEN>
    let pathname = parsed.pathname;
    pathname = pathname.replace(/(~[^!:]+![0-9]+:)[a-zA-Z0-9_-]+/g, '$1[REDACTED]');
    return pathname + (params.toString() ? `?${params.toString()}` : '');
  } catch {
    return url;
  }
}
