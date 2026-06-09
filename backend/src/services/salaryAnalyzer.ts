export interface SalaryAnalysisResult {
  riskScore: number;
  redFlags: string[];
  explanation: string[];
  salaryFound: boolean;
  parsedAnnualEquivalent: number | null;
}

/**
 * Parses numerical salary numbers and identifies hourly, weekly, monthly or annual frequencies
 */
function parseSalaryText(text: string): { amount: number; frequency: 'hourly' | 'weekly' | 'monthly' | 'annual' } | null {
  const clean = text.toLowerCase();
  
  // Extract dollar amounts (handling commas and optional decimals)
  const amountRegex = /\$([0-9,]+(\.[0-9]{2})?)/g;
  const matches = [...clean.matchAll(amountRegex)];
  
  if (matches.length === 0) return null;

  // Use the highest amount found in the string (often the upper bound of a range)
  const amounts = matches.map(m => parseFloat(m[1].replace(/,/g, '')));
  const maxAmount = Math.max(...amounts);

  // Check frequency
  let frequency: 'hourly' | 'weekly' | 'monthly' | 'annual' = 'annual';
  
  if (clean.includes('hour') || clean.includes('hr') || clean.includes('/h') || clean.includes('hourly')) {
    frequency = 'hourly';
  } else if (clean.includes('week') || clean.includes('wk') || clean.includes('/w') || clean.includes('weekly')) {
    frequency = 'weekly';
  } else if (clean.includes('month') || clean.includes('mo') || clean.includes('/m') || clean.includes('monthly')) {
    frequency = 'monthly';
  } else if (clean.includes('year') || clean.includes('yr') || clean.includes('/y') || clean.includes('annual') || clean.includes('annually') || maxAmount > 1500) {
    // If it's a large amount (e.g. > 1500) and no frequency was found, assume it is annual
    frequency = 'annual';
  } else {
    // Large amounts defaults to annual, small amounts to hourly
    frequency = maxAmount < 100 ? 'hourly' : 'weekly';
  }

  return { amount: maxAmount, frequency };
}

/**
 * Audits salary statements for unrealistic compensations, suspicious payout patterns, and missing values
 */
export function analyzeSalary(
  title: string,
  description: string,
  salaryText: string | null
): SalaryAnalysisResult {
  const redFlags: string[] = [];
  const explanation: string[] = [];
  let riskScore = 0;

  const cleanTitle = title.toLowerCase();
  const cleanDesc = description.toLowerCase();
  const rawSalary = salaryText || '';

  // 1. Check for Missing Compensation
  // If no salary text is provided and description contains no dollar symbols
  const hasDollarInDesc = cleanDesc.includes('$');
  const salaryFound = !!salaryText || hasDollarInDesc;

  if (!salaryFound) {
    riskScore += 15;
    explanation.push('No compensation details were provided in job metadata or posting text.');
  }

  // 2. Parse and evaluate salary figures
  let parsedAnnualEquivalent: number | null = null;
  let parsedRate = 0;
  let parsedFreq: string = '';

  const textToParse = salaryText || (hasDollarInDesc ? cleanDesc.match(/\$[0-9,]+/)?.[0] : null);

  if (textToParse) {
    const parsed = parseSalaryText(textToParse);
    if (parsed) {
      parsedRate = parsed.amount;
      parsedFreq = parsed.frequency;

      if (parsed.frequency === 'hourly') {
        parsedAnnualEquivalent = parsed.amount * 2000; // 2000 working hours in a year
      } else if (parsed.frequency === 'weekly') {
        parsedAnnualEquivalent = parsed.amount * 52;
      } else if (parsed.frequency === 'monthly') {
        parsedAnnualEquivalent = parsed.amount * 12;
      } else {
        parsedAnnualEquivalent = parsed.amount;
      }
    }
  }

  // 3. Unrealistic Entry-level salary verification
  const entryKeywords = ['assistant', 'data entry', 'clerk', 'typist', 'receptionist', 'customer service', 'admin', 'helper'];
  const isEntryLevel = entryKeywords.some(keyword => cleanTitle.includes(keyword));

  if (parsedAnnualEquivalent && isEntryLevel) {
    // High annual equivalent check (>$90,000 for data entry)
    if (parsedAnnualEquivalent > 90000) {
      riskScore += 40;
      redFlags.push(`Unrealistically high compensation ($${parsedAnnualEquivalent.toLocaleString()}/yr equivalent) for an entry-level position.`);
      explanation.push(`An entry-level title like "${title}" generally commands a salary range between $30k-$55k. The parsed rate of $${parsedAnnualEquivalent.toLocaleString()}/yr represents an anomaly.`);
    } 
    // High hourly rate check (>$45/hr)
    else if (parsedFreq === 'hourly' && parsedRate > 45) {
      riskScore += 40;
      redFlags.push(`Unrealistically high hourly rate ($${parsedRate}/hr) for entry-level tasks.`);
      explanation.push(`Hourly tasks for entry-level work typically range from $15-$25/hr. A rate of $${parsedRate}/hr is suspicious.`);
    }
  }

  // 4. Suspicious Compensation Patterns
  const suspiciousKeywords = [
    { word: 'daily payout', points: 20, desc: 'Mentions "daily payout" which is rare for standard corporate roles' },
    { word: 'weekly cash', points: 20, desc: 'Mentions weekly cash payments' },
    { word: 'pay via cash app', points: 25, desc: 'Uses Cash App as a payment channel' },
    { word: 'venmo', points: 20, desc: 'Suggests payment via Venmo' },
    { word: 'zelle', points: 20, desc: 'Suggests payment via Zelle' },
    { word: 'crypto payment', points: 25, desc: 'Asks to make payments in cryptocurrency' },
    { word: 'unlimited commission', points: 15, desc: 'Uses sales-pitch commission wording' },
    { word: 'immediate payout', points: 15, desc: 'Promises immediate payment structures' },
  ];

  for (const item of suspiciousKeywords) {
    if (cleanDesc.includes(item.word) || rawSalary.toLowerCase().includes(item.word)) {
      riskScore += item.points;
      redFlags.push(`Suspicious payout pattern: ${item.desc}.`);
    }
  }

  // Bound risk score
  riskScore = Math.min(100, Math.max(0, riskScore));

  return {
    riskScore,
    redFlags,
    explanation,
    salaryFound,
    parsedAnnualEquivalent,
  };
}
