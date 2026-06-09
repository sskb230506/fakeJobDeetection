import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { enrichCompany } from '../services/enrichmentService';

// Server-side rule-based evaluator
function runHeuristicScanner(title: string, desc: string, company: string, salary: string) {
  const cleanTitle = title.toLowerCase();
  const cleanDesc = desc.toLowerCase();
  const cleanCompany = company.toLowerCase();
  const cleanSalary = salary ? salary.toLowerCase() : '';

  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  let trustScore = 100;
  let companyVerified = true;

  // 1. Transaction and Chat keywords
  const suspiciousKeywords = ['whatsapp', 'telegram', 'wire transfer', 'deposit fee', 'fees', 'buy equipment', 'cash app', 'venmo', 'bitcoin', 'crypto'];
  const payoutKeywords = ['daily payout', 'make money fast', 'quick cash', 'unlimited income'];

  for (const word of suspiciousKeywords) {
    if (cleanDesc.includes(word) || cleanTitle.includes(word)) {
      redFlags.push(`Mentions suspicious communication/payment platform: "${word}"`);
    }
  }

  for (const word of payoutKeywords) {
    if (cleanDesc.includes(word) || cleanTitle.includes(word)) {
      redFlags.push(`Uses high-pressure financial hooks: "${word}"`);
    }
  }

  // 2. Email domain verification
  const emailRegex = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = cleanDesc.match(emailRegex);
  if (emails) {
    for (const email of emails) {
      const domain = email.split('@')[1].toLowerCase();
      const freeEmailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'mail.ru', 'protonmail.com', 'yandex.com'];
      if (freeEmailDomains.includes(domain)) {
        redFlags.push(`Recruitment email contact uses public domain: ${email}`);
        trustScore -= 15;
      }
    }
  }

  // 3. Compensation mismatch
  if (cleanSalary) {
    if (cleanSalary.includes('k') || cleanSalary.includes('$')) {
      if ((cleanTitle.includes('assistant') || cleanTitle.includes('entry') || cleanTitle.includes('data entry')) && 
          (cleanSalary.includes('100,000') || cleanSalary.includes('120,000') || cleanSalary.includes('150,000') || cleanDesc.includes('100/hr') || cleanDesc.includes('80/hr'))) {
        redFlags.push('Salary compensation is excessively high for an entry-level title.');
        trustScore -= 20;
      }
    }
  }

  // 4. Anonymous employer flag
  const suspiciousCompanies = ['anonymous', 'confidential', 'employer lookup', 'hiring agency', 'private recruiter'];
  const isSuspiciousCompany = suspiciousCompanies.some(item => cleanCompany.includes(item)) || cleanCompany.trim().length <= 2;
  
  if (isSuspiciousCompany) {
    redFlags.push('Hiring organization identity is anonymous or private.');
    trustScore -= 15;
    companyVerified = false;
  } else {
    greenFlags.push('Employer identity matches registered company.');
  }

  // 5. Green / Positive Indicators
  if (cleanDesc.includes('equal opportunity employer') || cleanDesc.includes('eoe')) {
    greenFlags.push('Contains Equal Opportunity statement.');
    trustScore += 5;
  }
  
  if (cleanDesc.includes('requirements') && cleanDesc.includes('qualifications') && cleanDesc.includes('responsibilities')) {
    greenFlags.push('Structured job criteria outline.');
    trustScore += 5;
  }

  if (cleanDesc.length > 800) {
    greenFlags.push('Comprehensive, structured description details.');
    trustScore += 5;
  }

  // Deduct score based on accumulated flags
  trustScore -= redFlags.length * 15;
  trustScore = Math.max(0, Math.min(100, trustScore));

  let status: 'safe' | 'suspicious' | 'danger' = 'safe';
  if (trustScore < 50) {
    status = 'danger';
  } else if (trustScore < 80) {
    status = 'suspicious';
  }

  return {
    trustScore,
    status,
    redFlags,
    greenFlags,
    companyVerified
  };
}

/**
 * Submits a job listing details, runs the analysis engine, registers the company, and records the logs
 */
export async function analyzeJob(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, companyName, location, salary, url, userId } = req.body;

    if (!title || !description || !companyName) {
      res.status(400).json({ error: 'Title, description, and companyName are required' });
      return;
    }

    // 1. Process Company record (find or create)
    let company = await prisma.company.findUnique({
      where: { name: companyName },
    });

    const heuristics = runHeuristicScanner(title, description, companyName, salary);
    const enrichment = enrichCompany(companyName);

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          verified: heuristics.companyVerified && enrichment.verified,
          trustScore: heuristics.trustScore,
          website: enrichment.website,
          linkedinUrl: enrichment.linkedinUrl,
          size: enrichment.size,
          foundedYear: enrichment.foundedYear,
        },
      });
    }

    // 2. Register Job Analysis
    const analysis = await prisma.jobAnalysis.create({
      data: {
        title,
        description,
        location: location || null,
        salary: salary || null,
        trustScore: heuristics.trustScore,
        status: heuristics.status,
        redFlags: heuristics.redFlags,
        greenFlags: heuristics.greenFlags,
        companyId: company.id,
        userId: userId || null,
      },
      include: {
        company: true,
      },
    });

    res.status(201).json(analysis);
  } catch (error: any) {
    console.error('Error analyzing job listing:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Fetches log details of a single scan
 */
export async function getJobAnalysisById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const analysis = await prisma.jobAnalysis.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!analysis) {
      res.status(404).json({ error: 'Analysis log not found' });
      return;
    }

    res.status(200).json(analysis);
  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Fetches analysis logs of a specific user
 */
export async function getHistoryByUserId(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId as string;

    const history = await prisma.jobAnalysis.findMany({
      where: { userId },
      include: {
        company: true,
      },
      orderBy: {
        scannedAt: 'desc',
      },
    });

    res.status(200).json(history);
  } catch (error: any) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
