import { JobDetails, ScanHistoryItem } from '../utils/types';
import './content.css';

// Persistent extension state
let shadowRoot: ShadowRoot | null = null;
let isOpen = true; // Slide open by default on first load/scan
let isLoading = false;
let currentAnalysis: ScanHistoryItem | null = null;
let currentJobId: string | null = null;

// Initialize the persistent sidebar DOM inside body
function initSidebar() {
  if (shadowRoot) return;

  const container = document.createElement('div');
  container.id = 'veriwork-sidebar-root';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.right = '0';
  container.style.zIndex = '99999999';
  document.body.appendChild(container);

  shadowRoot = container.attachShadow({ mode: 'open' });
  
  // Inject style link to extension's compiled content.css
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('content.css');
  shadowRoot.appendChild(styleLink);

  renderSidebar();
}

// Generate the sidebar content details dynamically
function renderContent(): string {
  if (isLoading) {
    return `
      <div class="space-y-5 animate-pulse">
        <!-- Job details skeleton -->
        <div class="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm space-y-2">
          <div class="h-3 w-1/4 bg-slate-200 rounded"></div>
          <div class="h-4.5 w-3/4 bg-slate-200 rounded"></div>
          <div class="h-3.5 w-1/2 bg-slate-200 rounded"></div>
        </div>

        <!-- Trust score circle skeleton -->
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center">
          <div class="w-24 h-24 rounded-full bg-slate-200 mb-4"></div>
          <div class="h-4 w-1/2 bg-slate-200 rounded mb-2"></div>
          <div class="h-3 w-1/3 bg-slate-200 rounded"></div>
        </div>
        
        <!-- Company card skeleton -->
        <div class="space-y-2">
          <div class="h-3 w-1/4 bg-slate-200 rounded"></div>
          <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm h-16 bg-slate-100/30"></div>
        </div>

        <!-- Risk card skeleton -->
        <div class="space-y-2">
          <div class="h-3 w-1/4 bg-slate-200 rounded"></div>
          <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm h-24 bg-slate-100/30"></div>
        </div>
      </div>
    `;
  }

  if (!currentAnalysis) {
    return `
      <div class="h-[350px] flex flex-col items-center justify-center text-center p-4">
        <div class="w-14 h-14 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <h3 class="text-sm font-bold text-slate-800 mb-1">No Active Scan</h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          Open a job listing description page on LinkedIn to launch automatic verification scanning.
        </p>
      </div>
    `;
  }

  const { result, job } = currentAnalysis;
  
  // Choose badge themes
  let badgeColor = 'bg-emerald-500 text-white';
  let badgeText = 'Verified Safe';
  let gaugeColor = 'stroke-emerald-500';

  if (result.status === 'danger') {
    badgeColor = 'bg-rose-500 text-white';
    badgeText = 'High Risk';
    gaugeColor = 'stroke-rose-500';
  } else if (result.status === 'suspicious') {
    badgeColor = 'bg-amber-500 text-amber-950';
    badgeText = 'Caution Flag';
    gaugeColor = 'stroke-amber-500';
  }

  const dashArray = 2 * Math.PI * 40;
  const dashOffset = dashArray * (1 - result.trustScore / 100);

  return `
    <!-- General Info Section -->
    <div class="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm">
      <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Active Job Listing</h3>
      <h2 class="text-sm font-bold text-slate-800 mb-1 leading-snug line-clamp-2">${job.title}</h2>
      <p class="text-xs text-slate-500 font-medium line-clamp-1">${job.company} • ${job.location}</p>
    </div>

    <!-- Trust Score Section -->
    <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
      <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 w-full text-left">Trust Index</h3>
      
      <!-- Progress circle -->
      <div class="relative w-28 h-28 flex items-center justify-center mb-3.5">
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" class="stroke-slate-100" stroke-width="8.5" fill="transparent" />
          <circle cx="50" cy="50" r="40" class="transition-all duration-700 ease-out ${gaugeColor}" stroke-width="8.5" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" stroke-linecap="round" fill="transparent" />
        </svg>
        <div class="absolute flex flex-col items-center justify-center">
          <span class="text-2xl font-extrabold text-slate-800">${result.trustScore}%</span>
          <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Index</span>
        </div>
      </div>

      <span class="inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full ${badgeColor}">
        ${badgeText}
      </span>
    </div>

    <!-- Company Verification Section -->
    <div>
      <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Company Integrity</h3>
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${result.companyVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
          ${result.companyVerified ? 
            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` : 
            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
          }
        </div>
        <div class="min-w-0">
          <h4 class="text-xs font-bold text-slate-800 m-0">${result.companyVerified ? 'Verified Organization' : 'Hidden/Anonymous Recruiter'}</h4>
          <p class="text-[10px] text-slate-400 m-0 mt-1 leading-normal">
            ${result.companyVerified ? 
              'The employer matches registered records. Active web footprints verify hiring legitimacy.' : 
              'Hiring entity has omitted corporate detail. Proceed with communication checks.'
            }
          </p>
        </div>
      </div>
    </div>

    <!-- Risk Factors Section (Red Flags) -->
    <div>
      <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Signals</h3>
      ${result.redFlags.length > 0 ? `
        <ul class="space-y-2 pl-0 list-none m-0">
          ${result.redFlags.map(flag => `
            <li class="flex items-start gap-2.5 text-[11px] text-rose-950 bg-rose-50 border border-rose-100 p-3 rounded-xl">
              <span class="text-rose-600 font-extrabold text-sm leading-none flex-shrink-0">⚠</span>
              <span class="leading-normal">${flag}</span>
            </li>
          `).join('')}
        </ul>
      ` : `
        <div class="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl text-center">
          <span class="text-[10px] text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            No immediate risk factors detected.
          </span>
        </div>
      `}
    </div>
  `;
}

// Compile and update layout inside Shadow DOM wrapper
function renderSidebar() {
  if (!shadowRoot) return;

  let wrapper = shadowRoot.getElementById('vw-sidebar-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'vw-sidebar-wrapper';
    shadowRoot.appendChild(wrapper);
  }

  const transformClass = isOpen ? 'translate-x-0' : 'translate-x-full';

  wrapper.innerHTML = `
    <!-- Toggle FAB (Floating Action Button) -->
    <button id="vw-sidebar-toggle" class="fixed right-6 bottom-24 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all cursor-pointer z-[99999999] border-none outline-none">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z"/></svg>
    </button>

    <!-- Sidebar Slide Panel -->
    <div id="vw-sidebar" class="fixed top-0 right-0 h-full w-[350px] bg-slate-50 border-l border-slate-200/60 shadow-2xl transition-transform duration-300 ${transformClass} z-[99999999] flex flex-col font-sans">
      
      <!-- Panel Header -->
      <div class="bg-gradient-to-r from-indigo-600 to-violet-700 text-white px-5 py-4 flex items-center justify-between shadow-md">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-white text-sm shadow-sm border border-white/10">
            VW
          </div>
          <div>
            <h1 class="text-sm font-extrabold tracking-tight m-0">VeriWork AI</h1>
            <p class="text-[9px] text-indigo-100/80 m-0">Floating Scorecard Panel</p>
          </div>
        </div>
        <button id="vw-sidebar-close" class="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white bg-transparent border-none outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- Scrollable evaluation dashboard -->
      <div class="flex-1 overflow-y-auto px-5 py-4.5 space-y-4">
        ${renderContent()}
      </div>

      <!-- Panel Footer -->
      <div class="bg-white border-t border-slate-100 py-3 px-5 flex items-center justify-between text-[9px] text-slate-400">
        <span>v1.0.0 • Secure Local Sandbox</span>
        <span class="font-semibold text-indigo-600">VeriWork Guardian</span>
      </div>
    </div>
  `;

  // Bind UI control events
  const toggleBtn = shadowRoot.getElementById('vw-sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isOpen = !isOpen;
      renderSidebar();
    });
  }

  const closeBtn = shadowRoot.getElementById('vw-sidebar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      isOpen = false;
      renderSidebar();
    });
  }
}

// Extract job details from page selectors (Resilient to layout changes)
function extractJobDetails(): JobDetails | null {
  const url = window.location.href;
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  let salary = '';
  let id = '';

  // 1. LinkedIn Details Extraction
  if (url.includes('linkedin.com')) {
    const titleEl = document.querySelector(
      '.jobs-unified-top-card__job-title, ' +
      '.job-details-jobs-unified-top-card__content--web h1, ' +
      'h1.t-24, ' +
      '.jobs-details h1, ' +
      '.jobs-search__job-details h1'
    );
    title = titleEl?.textContent?.trim() || '';

    const companyEl = document.querySelector(
      '.jobs-unified-top-card__company-name a, ' +
      '.jobs-unified-top-card__primary-description a, ' +
      '.jobs-details-header__company-link, ' +
      '[class*="company-name"]'
    );
    company = companyEl?.textContent?.trim() || '';

    const locationEl = document.querySelector(
      '.jobs-unified-top-card__bullet, ' +
      '.jobs-unified-top-card__primary-description span:nth-of-type(1), ' +
      '.jobs-details-header__location'
    );
    location = locationEl?.textContent?.trim() || '';

    const descEl = document.querySelector(
      '#job-details, ' +
      '.jobs-description__content, ' +
      '.jobs-box__html-content, ' +
      '.jobs-description-content'
    );
    description = descEl?.textContent?.trim() || '';

    const salaryEl = document.querySelector('.jobs-unified-top-card__salary-info, [class*="salary-info"]');
    salary = salaryEl?.textContent?.trim() || '';

    const match = url.match(/currentJobId=(\d+)/) || url.match(/jobs\/view\/(\d+)/);
    id = match ? match[1] : 'li-' + title.replace(/\s+/g, '-').toLowerCase().slice(0, 15);
  }
  // 2. Indeed Details Extraction
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
  // 3. Fallback General Extraction
  else {
    const titleEl = document.querySelector('h1');
    title = titleEl?.textContent?.trim() || '';
    company = document.title.split('-')[0]?.trim() || '';
    id = 'gen-' + Math.random().toString(36).substr(2, 9);
  }

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

// Request trust evaluation from background worker and manage sidebar visual states
function processPageScan() {
  const job = extractJobDetails();
  
  if (!job) {
    return;
  }

  // Prevent multiple redundant scans for the same job listing
  if (job.id === currentJobId && currentAnalysis) {
    return;
  }

  currentJobId = job.id;
  initSidebar();

  // Set loading state in UI
  isLoading = true;
  renderSidebar();

  // Communicate with background worker
  chrome.runtime.sendMessage(
    { type: 'SCAN_JOB', payload: job },
    (response: ScanHistoryItem) => {
      isLoading = false;
      if (response && response.result) {
        currentAnalysis = response;
      } else {
        currentAnalysis = null;
      }
      renderSidebar();
    }
  );
}

// Scan debounce logic to avoid overlapping processes
let debounceTimeout: NodeJS.Timeout;
function debouncedScan() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (settings && settings.enabled) {
        processPageScan();
      }
    });
  }, 800);
}

// Observer watching DOM shifts to track dynamically loaded job posts
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

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Periodic query parameters state check to handle SPA routing transitions
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('VeriWork detected SPA page navigation. Re-evaluating...');
    debouncedScan();
  }
}, 500);

// Run initial evaluation
debouncedScan();
console.log('VeriWork Content Script successfully initialized.');
