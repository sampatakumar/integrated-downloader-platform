import { isPrivateIp } from './middleware/ssrf.js';

const testCases = [
  // IPv4 Loopback and private ranges (Should be BLOCKED -> true)
  { ip: '127.0.0.1', expected: true, label: 'IPv4 Loopback' },
  { ip: '127.255.255.255', expected: true, label: 'IPv4 Loopback Broadcast' },
  { ip: '10.0.0.1', expected: true, label: 'Class A Private' },
  { ip: '172.16.42.1', expected: true, label: 'Class B Private' },
  { ip: '172.31.255.255', expected: true, label: 'Class B Private Boundary' },
  { ip: '192.168.1.100', expected: true, label: 'Class C Private' },
  { ip: '169.254.169.254', expected: true, label: 'AWS Link-Local' },
  { ip: '0.0.0.0', expected: true, label: 'Unspecified IPv4' },

  // IPv6 Loopback and private ranges (Should be BLOCKED -> true)
  { ip: '::1', expected: true, label: 'IPv6 Loopback' },
  { ip: '::', expected: true, label: 'IPv6 Unspecified' },
  { ip: 'fe80::1', expected: true, label: 'IPv6 Link-Local' },
  { ip: 'fc00::', expected: true, label: 'IPv6 Unique Local (fc)' },
  { ip: 'fd00::1234', expected: true, label: 'IPv6 Unique Local (fd)' },

  // Public IP ranges (Should be PERMITTED -> false)
  { ip: '8.8.8.8', expected: false, label: 'Google Public DNS' },
  { ip: '1.1.1.1', expected: false, label: 'Cloudflare DNS' },
  { ip: '142.250.190.46', expected: false, label: 'Google Host IPv4' },
  { ip: '2607:f8b0:4005:805::200e', expected: false, label: 'Google Host IPv6' }
];

console.log('--- Starting SSRF IP Validation Test Suite ---');
let passed = 0;

testCases.forEach(({ ip, expected, label }) => {
  const result = isPrivateIp(ip);
  const status = result === expected ? 'PASS' : 'FAIL';
  
  if (status === 'PASS') {
    passed++;
  }
  
  console.log(`[${status}] ${label} (${ip}) -> Expected private: ${expected}, Got: ${result}`);
});

console.log(`\nResults: ${passed}/${testCases.length} tests passed.`);

if (passed === testCases.length) {
  console.log('SUCCESS: All SSRF validation test cases passed.');
  process.exit(0);
} else {
  console.error('FAILURE: Some test cases failed.');
  process.exit(1);
}
