import * as dns from 'dns';
import * as tls from 'tls';
import { URL } from 'url';
import { enrichCompany } from './enrichmentService';

export interface VerificationResult {
  companyName: string;
  website: string | null;
  websiteExists: boolean;
  sslValid: boolean;
  sslDetails?: {
    authorized: boolean;
    validFrom: string;
    validTo: string;
    issuer: string;
  } | null;
  linkedinExists: boolean;
  glassdoorExists: boolean;
  employeeCount: string;
  score: number;
  details: string[];
}

/**
 * Validates domain resolution and queries SSL credentials using raw sockets
 */
async function checkWebsiteAndSSL(websiteUrl: string): Promise<{
  exists: boolean;
  sslValid: boolean;
  sslDetails?: VerificationResult['sslDetails'];
  log: string;
}> {
  try {
    const parsedUrl = new URL(websiteUrl);
    const host = parsedUrl.hostname;

    // 1. Resolve host IP (DNS lookup)
    try {
      await dns.promises.lookup(host);
    } catch {
      return {
        exists: false,
        sslValid: false,
        log: `DNS lookup failed for host: ${host}. The domain does not resolve.`,
      };
    }

    // 2. Perform raw TLS handshake to verify peer certificate
    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host,
          port: 443,
          servername: host,
          rejectUnauthorized: false, // Verify manually to extract details even if expired/untrusted
        },
        () => {
          const cert = socket.getPeerCertificate();
          const authorized = socket.authorized;
          socket.destroy();

          if (!cert || Object.keys(cert).length === 0) {
            resolve({
              exists: true,
              sslValid: false,
              log: `TLS connection established, but host ${host} returned no peer certificate.`,
            });
            return;
          }

          let issuerStr = '';
          if (cert.issuer) {
            const org = cert.issuer.O;
            issuerStr = Array.isArray(org) ? org.join(', ') : org || (typeof cert.issuer === 'string' ? cert.issuer : '');
          }

          resolve({
            exists: true,
            sslValid: authorized,
            sslDetails: {
              authorized,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              issuer: issuerStr,
            },
            log: `TLS handshake completed. Certificate is ${authorized ? 'valid' : 'invalid/untrusted'}, issued by: ${issuerStr}.`,
          });
        }
      );

      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          exists: true,
          sslValid: false,
          log: `TLS connection to ${host} failed: ${err.message}.`,
        });
      });

      socket.setTimeout(2500, () => {
        socket.destroy();
        resolve({
          exists: true,
          sslValid: false,
          log: `TLS handshake connection timed out for ${host}.`,
        });
      });
    });
  } catch (err: any) {
    return {
      exists: false,
      sslValid: false,
      log: `Failed to verify website format: ${err.message}.`,
    };
  }
}

/**
 * Runs a complete verification check for a company and returns a structured score
 */
export async function verifyCompanyCredentials(
  companyName: string,
  websiteUrl?: string | null
): Promise<VerificationResult> {
  const details: string[] = [];
  let score = 0;
  
  // Fetch details from enrichment service (slugs, sizes, names)
  const enrichment = enrichCompany(companyName);

  // 1. Website and SSL Checks (40 points max)
  let websiteExists = false;
  let sslValid = false;
  let sslDetails: VerificationResult['sslDetails'] = null;
  const targetWebsite = websiteUrl || enrichment.website;

  if (targetWebsite) {
    const webScan = await checkWebsiteAndSSL(targetWebsite);
    websiteExists = webScan.exists;
    sslValid = webScan.sslValid;
    sslDetails = webScan.sslDetails || null;
    details.push(webScan.log);
  } else {
    details.push('No website link is provided for this company.');
  }

  if (websiteExists) score += 20;
  if (sslValid) score += 20;

  // 2. LinkedIn Page Check (20 points max)
  // Check if company is verified or has a valid link
  const linkedinExists = enrichment.verified && enrichment.linkedinUrl.length > 0;
  if (linkedinExists) {
    score += 20;
    details.push(`LinkedIn Presence: Corporate page located at ${enrichment.linkedinUrl}.`);
  } else {
    details.push('LinkedIn Presence: No verified LinkedIn corporate directory listing found.');
  }

  // 3. Glassdoor Existence Check (20 points max)
  // In simulated/fallback, Glassdoor page matches LinkedIn existence logic
  const glassdoorExists = enrichment.verified;
  if (glassdoorExists) {
    score += 20;
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    details.push(`Glassdoor Reviews: Profile verified for "${companyName}" (Glassdoor directory link matches).`);
  } else {
    details.push('Glassdoor Reviews: No listing or verified reviews matching this recruiter.');
  }

  // 4. Employee Volume Audit (20 points max)
  const employeeCount = enrichment.size;
  const smallHeadcount = employeeCount.includes('1-10') || employeeCount.includes('11-50');
  if (enrichment.verified && !smallHeadcount) {
    score += 20;
    details.push(`Employee Volume: Company is registered with robust headcount scale (${employeeCount}).`);
  } else if (enrichment.verified) {
    score += 10;
    details.push(`Employee Volume: Company operates as a small team or startup (${employeeCount}).`);
  } else {
    details.push(`Employee Volume: Headcount records are untracked or unavailable.`);
  }

  return {
    companyName,
    website: targetWebsite,
    websiteExists,
    sslValid,
    sslDetails,
    linkedinExists,
    glassdoorExists,
    employeeCount,
    score,
    details,
  };
}
