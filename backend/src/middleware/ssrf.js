import dns from 'dns';
import { URL } from 'url';

/**
 * Checks if a given IP address is in a private, loopback, or link-local range.
 * Supports IPv4 and IPv6 validation.
 */
export function isPrivateIp(ip) {
  // Check for IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true; // Block invalid formats

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Class A Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Class B Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Class C Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link Local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0 (Unspecified)
    if (parts[0] === 0) return true;

    return false;
  }

  // Check for IPv6
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    // Loopback ::1
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // Link-local fe80::/10
    if (normalized.startsWith('fe80:')) return true;
    // Unique local fc00::/7 (fcxx: or fdxx:)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    return false;
  }

  return true; // Block unknown formats
}

/**
 * Express middleware to validate request URL fields against SSRF attacks.
 */
export function ssrfProtection(req, res, next) {
  const urlString = req.body.url || req.query.url;
  if (!urlString) {
    return next();
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only HTTP and HTTPS protocols are allowed' });
  }

  const hostname = parsedUrl.hostname;

  // Resolve DNS to verify IP destinations
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) {
      return res.status(400).json({ error: 'Domain name resolution failed' });
    }

    const hasPrivateIp = addresses.some(addr => isPrivateIp(addr.address));
    if (hasPrivateIp) {
      console.warn(`[SSRF Shield] Blocked request attempting to access local/private host: ${hostname}`);
      return res.status(400).json({ error: 'Access to private or local network is forbidden' });
    }

    next();
  });
}
export default ssrfProtection;
