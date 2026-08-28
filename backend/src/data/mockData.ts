import { Supplier, Buyer, CapitalProvider, Invoice, AgentLog } from '../models/types';

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-001',
    name: 'Apex Precision Engineering Ltd',
    industry: 'Automotive Components & Tooling',
    gstin: '27AAACA1234F1Z8',
    annualTurnoverLakhs: 480,
    completedDeals: 34,
    creditScore: 780,
    defaultRatePercent: 0.0,
    ratingGrade: 'A+'
  },
  {
    id: 'sup-002',
    name: 'BioPharma Life Solutions Pvt Ltd',
    industry: 'Pharmaceutical Packaging',
    gstin: '29AABCB5678G2Z1',
    annualTurnoverLakhs: 320,
    completedDeals: 19,
    creditScore: 745,
    defaultRatePercent: 0.0,
    ratingGrade: 'A'
  },
  {
    id: 'sup-003',
    name: 'TechFab Microelectronics',
    industry: 'Electronic Assemblies & PCBs',
    gstin: '33AABCT9012H3Z4',
    annualTurnoverLakhs: 650,
    completedDeals: 48,
    creditScore: 810,
    defaultRatePercent: 0.0,
    ratingGrade: 'AA'
  },
  {
    id: 'sup-004',
    name: 'AgroPure Essentials',
    industry: 'FMCG & Food Processing',
    gstin: '07AACCA3456J4Z7',
    annualTurnoverLakhs: 180,
    completedDeals: 8,
    creditScore: 680,
    defaultRatePercent: 1.2,
    ratingGrade: 'BBB'
  },
  {
    id: 'sup-005',
    name: 'UrbanCraft Textiles',
    industry: 'Garment & Industrial Fabrics',
    gstin: '24AAACU7890K5Z9',
    annualTurnoverLakhs: 210,
    completedDeals: 12,
    creditScore: 695,
    defaultRatePercent: 0.8,
    ratingGrade: 'BBB+'
  }
];

export const INITIAL_BUYERS: Buyer[] = [
  {
    id: 'buy-001',
    name: 'Global Motors India Corp',
    industry: 'Automotive OEM',
    gstin: '27AAACG9876E1Z5',
    rating: 'AAA',
    ratingScore: 96,
    avgPaymentDays: 45,
    disputeRatePercent: 0.1
  },
  {
    id: 'buy-002',
    name: 'MegaRetail Marts India Ltd',
    industry: 'Supermarket & FMCG Retail',
    gstin: '29AABCM5432D2Z3',
    rating: 'AA',
    ratingScore: 89,
    avgPaymentDays: 52,
    disputeRatePercent: 0.4
  },
  {
    id: 'buy-003',
    name: 'AutoTech Dynamics Global',
    industry: 'Heavy Vehicle Manufacturing',
    gstin: '33AACCA8765C3Z2',
    rating: 'A',
    ratingScore: 82,
    avgPaymentDays: 60,
    disputeRatePercent: 1.1
  },
  {
    id: 'buy-004',
    name: 'NovaTech Systems Infra',
    industry: 'Telecom Infrastructure',
    gstin: '07AAACN2109B4Z6',
    rating: 'BBB',
    ratingScore: 68,
    avgPaymentDays: 78,
    disputeRatePercent: 3.5
  }
];

export const INITIAL_PROVIDERS: CapitalProvider[] = [
  {
    id: 'prov-001',
    name: 'National Apex Bank',
    type: 'BANK',
    totalFundSizeLakhs: 600,
    availableLiquidityLakhs: 450,
    deployedCapitalLakhs: 150,
    riskAppetite: 'CONSERVATIVE',
    minAcceptableRiskScore: 80,
    maxTenorDays: 90,
    maxAdvanceRate: 0.70,
    baseInterestRatePercent: 9.0,
    originationFeePercent: 0.50,
    settlementSpeedHours: 72,
    maxExposurePerBuyerLakhs: 100,
    buyerExposures: {
      'buy-001': 35,
      'buy-002': 40,
      'buy-003': 20,
      'buy-004': 0
    },
    autoBidEnabled: true
  },
  {
    id: 'prov-002',
    name: 'Swift Growth Capital NBFC',
    type: 'NBFC',
    totalFundSizeLakhs: 400,
    availableLiquidityLakhs: 320,
    deployedCapitalLakhs: 80,
    riskAppetite: 'MODERATE',
    minAcceptableRiskScore: 65,
    maxTenorDays: 120,
    maxAdvanceRate: 0.90,
    baseInterestRatePercent: 11.5,
    originationFeePercent: 0.20,
    settlementSpeedHours: 2,
    maxExposurePerBuyerLakhs: 80,
    buyerExposures: {
      'buy-001': 25,
      'buy-002': 15,
      'buy-003': 10,
      'buy-004': 5
    },
    autoBidEnabled: true
  },
  {
    id: 'prov-003',
    name: 'Sovereign Supply Credit Fund',
    type: 'PRIVATE_CREDIT',
    totalFundSizeLakhs: 500,
    availableLiquidityLakhs: 380,
    deployedCapitalLakhs: 120,
    riskAppetite: 'MODERATE',
    minAcceptableRiskScore: 70,
    maxTenorDays: 150,
    maxAdvanceRate: 0.80,
    baseInterestRatePercent: 10.2,
    originationFeePercent: 0.35,
    settlementSpeedHours: 24,
    maxExposurePerBuyerLakhs: 90,
    buyerExposures: {
      'buy-001': 30,
      'buy-002': 20,
      'buy-003': 30,
      'buy-004': 0
    },
    autoBidEnabled: true
  },
  {
    id: 'prov-004',
    name: 'Velocity FinTech Liquidity Pool',
    type: 'FINTECH',
    totalFundSizeLakhs: 250,
    availableLiquidityLakhs: 180,
    deployedCapitalLakhs: 70,
    riskAppetite: 'AGGRESSIVE',
    minAcceptableRiskScore: 50,
    maxTenorDays: 60,
    maxAdvanceRate: 0.95,
    baseInterestRatePercent: 13.2,
    originationFeePercent: 0.15,
    settlementSpeedHours: 1,
    maxExposurePerBuyerLakhs: 50,
    buyerExposures: {
      'buy-001': 10,
      'buy-002': 15,
      'buy-003': 10,
      'buy-004': 15
    },
    autoBidEnabled: true
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-demo-20l',
    invoiceNumber: 'INV-2026-APEX-001',
    supplierId: 'sup-001',
    buyerId: 'buy-001',
    amountLakhs: 20.0,
    minRequiredAmountLakhs: 16.0,
    issueDate: '2026-08-15',
    dueDate: '2026-10-15',
    tenorDays: 60,
    goodsDescription: 'CNC Machined Transmission Housings (Batch #8942)',
    eWayBillNumber: 'EWB-271988421094',
    purchaseOrderNumber: 'PO-GM-2026-9921',
    status: 'DRAFT',
    preferences: {
      urgencyLevel: 'CRITICAL',
      targetAdvanceRate: 0.85,
      maxAcceptableRate: 14.0,
      priorityWeights: {
        advanceRate: 0.35,
        settlementSpeed: 0.30,
        interestRate: 0.20,
        fees: 0.10,
        tenorFlexibility: 0.05
      }
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'inv-fraud-002',
    invoiceNumber: 'INV-2026-FAKE-002',
    supplierId: 'sup-004',
    buyerId: 'buy-002',
    amountLakhs: 15.0,
    minRequiredAmountLakhs: 10.0,
    issueDate: '2026-08-20',
    dueDate: '2026-09-20',
    tenorDays: 30,
    goodsDescription: 'Bulk Organic Grains & Packaging Units',
    eWayBillNumber: 'EWB-INVALID-00000',
    purchaseOrderNumber: 'PO-FAKE-9999',
    status: 'DRAFT',
    preferences: {
      urgencyLevel: 'MEDIUM',
      targetAdvanceRate: 0.80,
      maxAcceptableRate: 12.0,
      priorityWeights: {
        interestRate: 0.40,
        advanceRate: 0.25,
        settlementSpeed: 0.15,
        fees: 0.10,
        tenorFlexibility: 0.10
      }
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'inv-risk-003',
    invoiceNumber: 'INV-2026-HIGH-003',
    supplierId: 'sup-005',
    buyerId: 'buy-004',
    amountLakhs: 25.0,
    minRequiredAmountLakhs: 18.0,
    issueDate: '2026-08-10',
    dueDate: '2026-11-10',
    tenorDays: 90,
    goodsDescription: 'Industrial Synthetic Tarpaulins & Cordage',
    eWayBillNumber: 'EWB-249918274610',
    purchaseOrderNumber: 'PO-NOVA-2026-4411',
    status: 'DRAFT',
    preferences: {
      urgencyLevel: 'LOW',
      targetAdvanceRate: 0.75,
      maxAcceptableRate: 16.0,
      priorityWeights: {
        interestRate: 0.45,
        fees: 0.20,
        advanceRate: 0.20,
        settlementSpeed: 0.10,
        tenorFlexibility: 0.05
      }
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'inv-large-004',
    invoiceNumber: 'INV-2026-LARGE-004',
    supplierId: 'sup-003',
    buyerId: 'buy-001',
    amountLakhs: 85.0,
    minRequiredAmountLakhs: 60.0,
    issueDate: '2026-08-25',
    dueDate: '2026-11-25',
    tenorDays: 90,
    goodsDescription: 'Automotive ECU Circuit Boards (12,000 units)',
    eWayBillNumber: 'EWB-338877112233',
    purchaseOrderNumber: 'PO-GM-2026-8800',
    status: 'DRAFT',
    preferences: {
      urgencyLevel: 'MEDIUM',
      targetAdvanceRate: 0.80,
      maxAcceptableRate: 11.0,
      priorityWeights: {
        interestRate: 0.35,
        advanceRate: 0.30,
        settlementSpeed: 0.15,
        fees: 0.10,
        tenorFlexibility: 0.10
      }
    },
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_LOGS: AgentLog[] = [
  {
    id: 'log-init-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    agentName: 'Agent 1: Supplier Demand & Verification Agent',
    level: 'INFO',
    message: 'Supplier Demand & Verification Agent initialized. Connected to GST Portal & eWay Bill mock registry.'
  },
  {
    id: 'log-init-2',
    timestamp: new Date(Date.now() - 3550000).toISOString(),
    agentName: 'Agent 2: Capital Provider Underwriting Agent',
    level: 'INFO',
    message: 'Capital Provider Underwriting Agents online across 4 institutions with ₹15.5 Cr deployable capital.'
  },
  {
    id: 'log-init-3',
    timestamp: new Date(Date.now() - 3500000).toISOString(),
    agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
    level: 'INFO',
    message: 'Marketplace Clearing & Settlement Agent online with multi-attribute TOPSIS utility optimization.'
  }
];
