export interface JobDetails {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  url: string;
  timestamp: number;
}

export interface AnalysisResult {
  jobId: string;
  trustScore: number; // 0 to 100
  status: 'safe' | 'suspicious' | 'danger';
  redFlags: string[];
  greenFlags: string[];
  scannedAt: number;
  companyVerified: boolean;
}

export interface ExtensionSettings {
  enabled: boolean;
  autoAlert: boolean;
  strictMode: boolean;
}

export interface ScanHistoryItem {
  job: JobDetails;
  result: AnalysisResult;
}

export type MessageType =
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'SCAN_JOB'
  | 'GET_LAST_SCAN'
  | 'GET_HISTORY'
  | 'CLEAR_HISTORY';

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
}
