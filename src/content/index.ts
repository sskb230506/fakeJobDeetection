import { JobDetails, ScanHistoryItem } from '../utils/types';
import './content.css';

// Keep track of the currently scanned job ID to prevent infinite scan loops
let currentJobId: string | null = null;
let shadowRootContainer: HTMLDivElement | null = null;

// Helper to extract job details from the current page
function extractJobDetails(): JobDetails | null {
  const url = window.location.href;
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  let salary = '';
  let id = '';

  // 1. LinkedIn Detection
  if (url.includes('linkedin.com')) {
    // Title
    const titleEl = document.querySelector(
      '.jobs-unified-top-card__job-title, ' +
      '.job-details-jobs-unified-top-card__content--web h1, ' +
      'h1.t-24, ' +
      '.jobs-details h1, ' +
      '.jobs-search__job-details h1'
    );
    title = titleEl?.textContent?.trim() || '';

    // Company
    const companyEl = document.querySelector(
      '.jobs-unified-top-card__company-name a, ' +
      '.jobs-unified-top-card__primary-description a, ' +
      '.jobs-details-header__company-link, ' +
      '[class*="company-name"]'
    );
    company = companyEl?.textContent?.trim() || '';

    // Location
    const locationEl = document.querySelector(
      '.jobs-unified-top-card__bullet, ' +
      '.jobs-unified-top-card__primary-description span:nth-of-type(1), ' +
      '.jobs-details-header__location'
    );
    location = locationEl?.textContent?.trim() || '';

    // Description
    const descEl = document.querySelector(
      '#job-details, ' +
      '.jobs-description__content, ' +
      '.jobs-box__html-content, ' +
      '.jobs-description-content'
    );
    description = descEl?.textContent?.trim() || '';

    // Salary info
    const salaryEl = document.querySelector('.jobs-unified-top-card__salary-info, [class*="salary-info"]');
    salary = salaryEl?.textContent?.trim() || '';

    // Job ID from URL or DOM
    const match = url.match(/currentJobId=(\d+)/) || url.match(/jobs\/view\/(\d+)/);
    id = match ? match[1] : 'li-' + title.replace(/\s+/g, '-').toLowerCase().slice(0, 15);
  }
  // 2. Indeed Detection
  else if (url.includes('indeed.com')) {
    const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title, h1');
    title = titleEl?.textContent?.trim() || '';

    const companyEl = document.querySelector('[data-company-name="true"] a, .jobsearch-InlineCompanyRating a, .jobsearch-CompanyInfoContainer');
    company = companyEl?.textContent?.trim() || '';

    const locationEl = document.querySelector('.jobsearch-JobInfoHeader-companyLocation, .jobsearch-JobInfoWrapper-companyLocation');
    location = locationEl?.textContent?.trim() || '';

    const descEl = document.querySelector('#jobDescriptionText');
    description = descEl?.textContent?.trim() || '';

    const salaryEl = document.querySelector('#salaryInfoAndJobType, .jobsearch-JobMetadataHeader-item');
    salary = salaryEl?.textContent?.trim() || '';

    const match = url.match(/jk=([a-f0-9]+)/);
    id = match ? match[1] : 'in-' + title.replace(/\s+/g, '-').toLowerCase().slice(0, 15);
  }
  // 3. Fallback General parser
  else {
    const titleEl = document.querySelector('h1');
    title = titleEl?.textContent?.trim() || '';
    company = document.title.split('-')[0]?.trim() || '';
    id = 'gen-' + Math.random().toString(36).substr(2, 9);
  }

  // If we don't have enough basic info, skip scanning
  if (!title || !description) {
    return null;
  }

  return {
    id,
    title,
    company,
    location,
    description,
    salary,
    url,
    timestamp: Date.now(),
  };
}

// Injects the scorecard widget into the page DOM
function injectSafetyWidget(analysis: ScanHistoryItem) {
  const { result, job } = analysis;
  
  // Find suitable injection container depending on site
  let targetContainer: Element | null = null;

  if (window.location.href.includes('linkedin.com')) {
    targetContainer = document.querySelector('.jobs-unified-top-card__content--web, .jobs-description__container, #job-details');
  } else if (window.location.href.includes('indeed.com')) {
    targetContainer = document.querySelector('.jobsearch-JobComponent, .jobsearch-ViewJobLayout-jobDisplay');
  }

  if (!targetContainer) {
    return;
  }

  // Remove existing widget if present
  if (shadowRootContainer && shadowRootContainer.parentNode) {
    shadowRootContainer.parentNode.removeChild(shadowRootContainer);
  }

  // Create new widget root
  shadowRootContainer = document.createElement('div');
  shadowRootContainer.id = 'veriwork-safety-widget-root';
  shadowRootContainer.style.margin = '16px 0';
  shadowRootContainer.style.width = '100%';

  // Inject at the very beginning of the target container
  targetContainer.insertBefore(shadowRootContainer, targetContainer.firstChild);

  // Attach Shadow DOM for encapsulation
  const shadow = shadowRootContainer.attachShadow({ mode: 'open' });

  // Add stylesheet link pointing to our extension's compiled css
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('content.css');
  shadow.appendChild(styleLink);

  // Widget main container element
  const widget = document.createElement('div');
  widget.className = 'p-5 rounded-2xl border bg-white/90 backdrop-blur-md transition-all duration-300 font-sans shadow-md';
  
  // Color styling based on safety status
  let statusColor = 'border-emerald-200 bg-emerald-50/50';
  let badgeColor = 'bg-emerald-500 text-white';
  let badgeText = 'Verified Listing';
  let scoreColor = 'text-emerald-600';

  if (result.status === 'danger') {
    statusColor = 'border-rose-200 bg-rose-50/50';
    badgeColor = 'bg-rose-500 text-white';
    badgeText = 'High Risk Alert';
    scoreColor = 'text-rose-600';
  } else if (result.status === 'suspicious') {
    statusColor = 'border-amber-200 bg-amber-50/50';
    badgeColor = 'bg-amber-500 text-amber-950';
    badgeText = 'Caution Recommended';
    scoreColor = 'text-amber-600';
  }

  // Compose Widget HTML
  widget.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
          VW
        </div>
        <div>
          <h4 class="text-sm font-bold text-slate-800 m-0">VeriWork AI Safety Score</h4>
          <span class="inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 mt-1 rounded-full ${badgeColor}">
            ${badgeText}
          </span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-3xl font-extrabold ${scoreColor}">${result.trustScore}%</span>
        <p class="text-[10px] text-slate-400 m-0">Trust index</p>
      </div>
    </div>

    <!-- Alert / Red flag details -->
    ${result.redFlags.length > 0 ? `
      <div class="mb-4">
        <p class="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2">Red Flags Detected (${result.redFlags.length}):</p>
        <ul class="space-y-1.5 m-0 pl-0 list-none">
          ${result.redFlags.map(flag => `
            <li class="flex items-start gap-2 text-xs text-rose-800 bg-rose-100/40 px-3 py-1.5 rounded-lg border border-rose-200/50">
              <span class="font-bold text-rose-600">⚠</span>
              <span>${flag}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Green flag details -->
    ${result.greenFlags.length > 0 && result.status !== 'danger' ? `
      <div class="mb-2">
        <p class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Safety Indicators:</p>
        <ul class="space-y-1.5 m-0 pl-0 list-none">
          ${result.greenFlags.slice(0, 2).map(flag => `
            <li class="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-100/30 px-3 py-1.5 rounded-lg border border-emerald-200/50">
              <span class="font-bold text-emerald-600">✓</span>
              <span>${flag}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center text-[11px] text-slate-400">
      <span>Scanned in real-time</span>
      <span class="font-medium text-indigo-600 cursor-pointer hover:underline" id="vw-details-btn">Open VeriWork Dashboard</span>
    </div>
  `;

  // Append widget inside the shadow root
  shadow.appendChild(widget);

  // Link inside the widget to open popup/dashboard
  const btn = shadow.getElementById('vw-details-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      // Prompt user to open popup
      alert('Open the VeriWork Extension icon in your browser toolbar to manage settings and view full analysis logs!');
    });
  }
}

// Function that handles scanning page content
function processPageScan() {
  const job = extractJobDetails();
  
  if (!job) {
    return;
  }

  // If the job ID matches what we already scanned, skip
  if (job.id === currentJobId) {
    return;
  }

  currentJobId = job.id;

  // Send to background service worker for evaluation
  chrome.runtime.sendMessage(
    { type: 'SCAN_JOB', payload: job },
    (response: ScanHistoryItem) => {
      if (response && response.result) {
        injectSafetyWidget(response);
      }
    }
  );
}

// Run the scan
let debounceTimeout: NodeJS.Timeout;
function debouncedScan() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    // Only scan if the extension is enabled
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (settings && settings.enabled) {
        processPageScan();
      }
    });
  }, 800);
}

// MutationObserver watches for DOM modifications (e.g. AJAX page loading or tab switches)
const observer = new MutationObserver((mutations) => {
  let shouldScan = false;
  
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldScan = true;
      break;
    }
  }

  if (shouldScan) {
    debouncedScan();
  }
});

// Start observing target
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Active SPA URL navigation listener
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('VeriWork detected SPA page navigation. Re-evaluating...');
    debouncedScan();
  }
}, 500);

// Initial run on script injection
debouncedScan();
console.log('VeriWork Content Script successfully initialized.');
