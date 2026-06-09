import { JobDetails, AnalysisResult, ExtensionSettings, ScanHistoryItem } from '../utils/types';

// Default extension settings
const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  autoAlert: true,
  strictMode: false,
};

// Heuristics analyzer function
function analyzeJobContent(job: JobDetails): AnalysisResult {
  const title = job.title.toLowerCase();
  const desc = job.description.toLowerCase();
  const company = job.company.toLowerCase();
  const salary = job.salary ? job.salary.toLowerCase() : '';

  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  let trustScore = 100;
  let companyVerified = true;

  // 1. Check suspicious keywords in description / title
  const urgentKeywords = ['urgent', 'immediately hiring', 'hire immediately', 'start today', 'no experience required'];
  const suspiciousKeywords = ['whatsapp', 'telegram', 'wire transfer', 'deposit fee', 'fees', 'buy equipment', 'cash app', 'venmo', 'bitcoin', 'crypto'];
  const payoutKeywords = ['daily payout', 'make money fast', 'quick cash', 'unlimited income'];

  // Keyword Checks
  let keywordFlagsCount = 0;
  for (const word of suspiciousKeywords) {
    if (desc.includes(word) || title.includes(word)) {
      redFlags.push(`Mentions suspicious transaction/communication tool: "${word}"`);
      keywordFlagsCount++;
    }
  }

  for (const word of payoutKeywords) {
    if (desc.includes(word) || title.includes(word)) {
      redFlags.push(`Uses high-pressure financial hooks: "${word}"`);
      keywordFlagsCount++;
    }
  }

  // 2. Check for suspicious emails in the job posting
  const emailRegex = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = desc.match(emailRegex);
  if (emails) {
    for (const email of emails) {
      const domain = email.split('@')[1].toLowerCase();
      const freeEmailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'mail.ru', 'protonmail.com', 'yandex.com'];
      if (freeEmailDomains.includes(domain)) {
        redFlags.push(`Hiring contact uses a free email domain: ${email}`);
        trustScore -= 15;
      }
    }
  }

  // 3. Salary-to-Title disproportion / vague high payouts
  if (salary) {
    if (salary.includes('k') || salary.includes('$')) {
      if ((title.includes('assistant') || title.includes('entry') || title.includes('data entry')) && 
          (salary.includes('100,000') || salary.includes('120,000') || salary.includes('150,000') || desc.includes('100/hr') || desc.includes('80/hr'))) {
        redFlags.push('Salary appears disproportionately high for an entry-level position.');
        trustScore -= 20;
      }
    }
  }

  // 4. Verification of Company Name
  const suspiciousCompanies = ['anonymous', 'confidential', 'employer lookup', 'hiring agency', 'private recruiter'];
  const isSuspiciousCompany = suspiciousCompanies.some(item => company.includes(item)) || company.trim().length <= 2;
  
  if (isSuspiciousCompany) {
    redFlags.push('Employer identity is hidden or anonymous.');
    trustScore -= 15;
    companyVerified = false;
  } else {
    greenFlags.push('Verified employer name present.');
  }

  // 5. Positive / Green Flags
  if (desc.includes('equal opportunity employer') || desc.includes('eoe')) {
    greenFlags.push('Includes Equal Opportunity Employer statement.');
    trustScore += 5;
  }
  
  if (desc.includes('requirements') && desc.includes('qualifications') && desc.includes('responsibilities')) {
    greenFlags.push('Detailed, structured job layout.');
    trustScore += 5;
  }

  if (desc.length > 800) {
    greenFlags.push('Comprehensive job description (low likelihood of quick scam template).');
    trustScore += 5;
  }

  // Adjust score based on red flags
  trustScore -= redFlags.length * 15;

  // Bound trust score
  trustScore = Math.max(0, Math.min(100, trustScore));

  // Determine safety status
  let status: 'safe' | 'suspicious' | 'danger' = 'safe';
  if (trustScore < 50) {
    status = 'danger';
  } else if (trustScore < 80) {
    status = 'suspicious';
  }

  return {
    jobId: job.id,
    trustScore,
    status,
    redFlags,
    greenFlags,
    scannedAt: Date.now(),
    companyVerified,
  };
}

// Service Worker Listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('VeriWork Extension Installed');
  chrome.storage.local.get(['settings', 'history'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
    if (!result.history) {
      chrome.storage.local.set({ history: [] });
    }
  });
});

const BACKEND_URL = 'http://localhost:5000/api/jobs/analyze';

// Async helper to post job details to Express server with retry backoff
async function scanJobOnBackend(job: JobDetails, retries = 3, delay = 1000): Promise<any> {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: job.title,
        description: job.description,
        companyName: job.company,
        location: job.location,
        salary: job.salary,
        url: job.url,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Backend scan failed. Retrying in ${delay}ms... (Retries left: ${retries})`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return scanJobOnBackend(job, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Shared storage saver
function saveScanItem(item: ScanHistoryItem, sendResponse: (response: any) => void) {
  chrome.storage.local.get('history', (result) => {
    const history: ScanHistoryItem[] = result.history || [];
    const filteredHistory = history.filter(h => h.job.id !== item.job.id);
    const updatedHistory = [item, ...filteredHistory].slice(0, 20);

    chrome.storage.local.set({ 
      history: updatedHistory,
      lastScan: item 
    }, () => {
      sendResponse(item);
    });
  });
}

// Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === 'GET_SETTINGS') {
    chrome.storage.local.get('settings', (result) => {
      sendResponse(result.settings || DEFAULT_SETTINGS);
    });
    return true; // Keep message channel open for async response
  }

  if (type === 'UPDATE_SETTINGS') {
    chrome.storage.local.set({ settings: payload }, () => {
      sendResponse({ success: true, settings: payload });
    });
    return true;
  }

  if (type === 'SCAN_JOB') {
    const job: JobDetails = payload;
    
    // Attempt backend analysis with offline fallback
    scanJobOnBackend(job)
      .then((backendResult) => {
        const newHistoryItem: ScanHistoryItem = {
          job: {
            id: job.id,
            title: backendResult.title,
            company: backendResult.company.name,
            location: backendResult.location || '',
            description: backendResult.description,
            salary: backendResult.salary || '',
            url: job.url,
            timestamp: new Date(backendResult.scannedAt).getTime()
          },
          result: {
            jobId: job.id,
            trustScore: backendResult.trustScore,
            status: backendResult.status,
            redFlags: backendResult.redFlags,
            greenFlags: backendResult.greenFlags,
            scannedAt: new Date(backendResult.scannedAt).getTime(),
            companyVerified: backendResult.company.verified
          }
        };
        saveScanItem(newHistoryItem, sendResponse);
      })
      .catch((err) => {
        console.error('Failed to analyze job on backend. Falling back to local scanner.', err);
        const localAnalysis = analyzeJobContent(job);
        
        // Add offline scanning indication flag
        localAnalysis.greenFlags = [
          ...localAnalysis.greenFlags,
          'Offline Mode: Client-side local heuristic scan.'
        ];

        const newHistoryItem: ScanHistoryItem = { job, result: localAnalysis };
        saveScanItem(newHistoryItem, sendResponse);
      });
    return true; // Keep channel open for async fetch resolution
  }

  if (type === 'GET_LAST_SCAN') {
    chrome.storage.local.get('lastScan', (result) => {
      sendResponse(result.lastScan || null);
    });
    return true;
  }

  if (type === 'GET_HISTORY') {
    chrome.storage.local.get('history', (result) => {
      sendResponse(result.history || []);
    });
    return true;
  }

  if (type === 'CLEAR_HISTORY') {
    chrome.storage.local.set({ history: [], lastScan: null }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
