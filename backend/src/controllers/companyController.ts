import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { enrichCompany } from '../services/enrichmentService';

/**
 * Retrieves a list of all company records
 */
export async function getCompanies(req: Request, res: Response): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
    res.status(200).json(companies);
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Fetches a single company detail along with its scanned listings
 */
export async function getCompanyById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { scannedAt: 'desc' },
        },
      },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.status(200).json(company);
  } catch (error: any) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Creates a company or alters verification parameters manually
 */
export async function verifyCompany(req: Request, res: Response): Promise<void> {
  try {
    const { name, verified, website, trustScore } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }

    const company = await prisma.company.upsert({
      where: { name },
      update: {
        verified: verified !== undefined ? verified : undefined,
        website: website || undefined,
        trustScore: trustScore !== undefined ? trustScore : undefined,
      },
      create: {
        name,
        verified: verified || false,
        website: website || null,
        trustScore: trustScore !== undefined ? trustScore : 100,
      },
    });

    res.status(200).json(company);
  } catch (error: any) {
    console.error('Error verifying company:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * Enriches and retrieves company metrics on-demand via name query param
 */
export async function enrichCompanyByName(req: Request, res: Response): Promise<void> {
  try {
    const name = req.query.name as string;

    if (!name) {
      res.status(400).json({ error: 'Company name query parameter is required' });
      return;
    }

    // Check if company already exists
    let company = await prisma.company.findUnique({
      where: { name },
    });

    if (!company) {
      const enrichment = enrichCompany(name);
      company = await prisma.company.create({
        data: {
          name,
          verified: enrichment.verified,
          website: enrichment.website,
          linkedinUrl: enrichment.linkedinUrl,
          size: enrichment.size,
          foundedYear: enrichment.foundedYear,
          trustScore: 100,
        },
      });
    }

    res.status(200).json(company);
  } catch (error: any) {
    console.error('Error in company enrichment endpoint:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
