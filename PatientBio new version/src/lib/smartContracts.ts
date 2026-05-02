/**
 * Smart Contract-Based Consent Logic
 * Implements transparent, verifiable consent validation
 * Part of Enhanced AI Technology (Phase 5.3)
 */

import { sha256Sync } from './merkleTree';

/**
 * Consent scope definition
 */
export interface ConsentScope {
  dataCategories?: string[];
  purposes?: string[];
  jurisdictions?: string[];
  providers?: string[];
  recordTypes?: string[];
}

/**
 * Consent conditions
 */
export interface ConsentConditions {
  expiresAt?: Date | string;
  maxAccessCount?: number;
  requireReasonPerAccess?: boolean;
  allowAnonymizedOnly?: boolean;
  notifyOnAccess?: boolean;
  restrictToEmergency?: boolean;
}

/**
 * Consent record structure
 */
export interface ConsentRecord {
  id: string;
  patientId: string;
  consentType: 'data_sharing' | 'research_participation' | 'emergency_access' | 'provider_access' | 'marketing';
  purpose: string;
  scope: ConsentScope;
  conditions: ConsentConditions;
  grantedAt: Date | string;
  grantedToId?: string;
  grantedToType?: string;
  isActive: boolean;
  revokedAt?: Date | string;
  digitalSignature?: string;
}

/**
 * Access request for validation
 */
export interface AccessRequest {
  requesterId: string;
  requesterType: 'doctor' | 'hospital' | 'pathologist' | 'researcher' | 'emergency_responder';
  patientId: string;
  dataCategories: string[];
  purpose: string;
  reason?: string;
  isEmergency?: boolean;
  jurisdiction?: string;
}

/**
 * Consent validation verdict
 */
export interface ConsentVerdict {
  allowed: boolean;
  consentId?: string;
  reason: string;
  restrictions?: string[];
  warnings?: string[];
  auditData: {
    requestHash: string;
    evaluatedAt: string;
    matchedConditions: string[];
    failedConditions: string[];
  };
}

/**
 * Smart Contract class for consent validation
 */
export class ConsentSmartContract {
  private consents: ConsentRecord[];

  constructor(consents: ConsentRecord[]) {
    this.consents = consents.filter(c => c.isActive);
  }

  /**
   * Evaluate an access request against all active consents
   */
  evaluate(request: AccessRequest): ConsentVerdict {
    const matchedConditions: string[] = [];
    const failedConditions: string[] = [];
    const warnings: string[] = [];
    const restrictions: string[] = [];

    // Generate request hash for audit
    const requestHash = sha256Sync(JSON.stringify({
      requesterId: request.requesterId,
      requesterType: request.requesterType,
      patientId: request.patientId,
      dataCategories: request.dataCategories,
      purpose: request.purpose,
      timestamp: new Date().toISOString(),
    }));

    // Find applicable consents
    const applicableConsents = this.consents.filter(consent => 
      consent.patientId === request.patientId
    );

    if (applicableConsents.length === 0) {
      return {
        allowed: false,
        reason: 'No active consent found for this patient',
        auditData: {
          requestHash,
          evaluatedAt: new Date().toISOString(),
          matchedConditions: [],
          failedConditions: ['NO_CONSENT_FOUND'],
        },
      };
    }

    // Check each consent
    for (const consent of applicableConsents) {
      const validation = this.validateConsent(consent, request);
      
      if (validation.passed) {
        matchedConditions.push(...validation.matched);
        
        // Apply restrictions from conditions
        if (consent.conditions.allowAnonymizedOnly) {
          restrictions.push('Data must be anonymized');
        }
        if (consent.conditions.notifyOnAccess) {
          warnings.push('Patient will be notified of this access');
        }

        return {
          allowed: true,
          consentId: consent.id,
          reason: 'Access granted based on valid consent',
          restrictions: restrictions.length > 0 ? restrictions : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
          auditData: {
            requestHash,
            evaluatedAt: new Date().toISOString(),
            matchedConditions,
            failedConditions: validation.failed,
          },
        };
      } else {
        failedConditions.push(...validation.failed);
      }
    }

    // No matching consent found
    return {
      allowed: false,
      reason: `Access denied: ${failedConditions[0] || 'Consent conditions not met'}`,
      auditData: {
        requestHash,
        evaluatedAt: new Date().toISOString(),
        matchedConditions,
        failedConditions,
      },
    };
  }

  /**
   * Validate a specific consent against a request
   */
  private validateConsent(
    consent: ConsentRecord,
    request: AccessRequest
  ): { passed: boolean; matched: string[]; failed: string[] } {
    const matched: string[] = [];
    const failed: string[] = [];

    // Check expiration
    if (consent.conditions.expiresAt) {
      const expiryDate = new Date(consent.conditions.expiresAt);
      if (expiryDate < new Date()) {
        failed.push('CONSENT_EXPIRED');
        return { passed: false, matched, failed };
      }
      matched.push('EXPIRY_VALID');
    }

    // Check emergency access
    if (consent.conditions.restrictToEmergency && !request.isEmergency) {
      failed.push('EMERGENCY_ONLY_CONSENT');
      return { passed: false, matched, failed };
    }
    if (consent.conditions.restrictToEmergency && request.isEmergency) {
      matched.push('EMERGENCY_ACCESS_VALID');
    }

    // Check requester type
    if (consent.grantedToType && consent.grantedToType !== request.requesterType) {
      failed.push('REQUESTER_TYPE_MISMATCH');
      return { passed: false, matched, failed };
    }
    matched.push('REQUESTER_TYPE_VALID');

    // Check specific requester
    if (consent.grantedToId && consent.grantedToId !== request.requesterId) {
      failed.push('REQUESTER_ID_MISMATCH');
      return { passed: false, matched, failed };
    }
    if (consent.grantedToId) {
      matched.push('REQUESTER_ID_VALID');
    }

    // Check data categories
    if (consent.scope.dataCategories && consent.scope.dataCategories.length > 0) {
      const hasAllCategories = request.dataCategories.every(cat =>
        consent.scope.dataCategories!.includes(cat)
      );
      if (!hasAllCategories) {
        failed.push('DATA_CATEGORY_NOT_IN_SCOPE');
        return { passed: false, matched, failed };
      }
      matched.push('DATA_CATEGORIES_VALID');
    }

    // Check purpose
    if (consent.scope.purposes && consent.scope.purposes.length > 0) {
      if (!consent.scope.purposes.includes(request.purpose)) {
        failed.push('PURPOSE_NOT_IN_SCOPE');
        return { passed: false, matched, failed };
      }
      matched.push('PURPOSE_VALID');
    }

    // Check jurisdiction
    if (consent.scope.jurisdictions && consent.scope.jurisdictions.length > 0 && request.jurisdiction) {
      if (!consent.scope.jurisdictions.includes(request.jurisdiction)) {
        failed.push('JURISDICTION_NOT_ALLOWED');
        return { passed: false, matched, failed };
      }
      matched.push('JURISDICTION_VALID');
    }

    // Check reason requirement
    if (consent.conditions.requireReasonPerAccess && !request.reason) {
      failed.push('REASON_REQUIRED');
      return { passed: false, matched, failed };
    }
    if (consent.conditions.requireReasonPerAccess && request.reason) {
      matched.push('REASON_PROVIDED');
    }

    return { passed: true, matched, failed };
  }

  /**
   * Generate a consent signature for verification
   */
  static generateSignature(consent: Omit<ConsentRecord, 'digitalSignature'>): string {
    const content = JSON.stringify({
      patientId: consent.patientId,
      consentType: consent.consentType,
      purpose: consent.purpose,
      scope: consent.scope,
      conditions: consent.conditions,
      grantedAt: consent.grantedAt,
      grantedToId: consent.grantedToId,
    });
    
    return sha256Sync(content);
  }

  /**
   * Verify a consent signature
   */
  static verifySignature(consent: ConsentRecord): boolean {
    if (!consent.digitalSignature) {
      return false;
    }

    const expectedSignature = this.generateSignature(consent);
    return expectedSignature === consent.digitalSignature;
  }

  /**
   * Get all consents for a patient
   */
  getPatientConsents(patientId: string): ConsentRecord[] {
    return this.consents.filter(c => c.patientId === patientId);
  }

  /**
   * Get active consents by type
   */
  getConsentsByType(patientId: string, consentType: ConsentRecord['consentType']): ConsentRecord[] {
    return this.consents.filter(
      c => c.patientId === patientId && c.consentType === consentType
    );
  }
}

/**
 * Create a new consent record with signature
 */
export function createConsentRecord(
  data: Omit<ConsentRecord, 'id' | 'digitalSignature'>
): ConsentRecord {
  const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  const consentWithoutSig = { ...data, id };
  const signature = ConsentSmartContract.generateSignature(consentWithoutSig);
  
  return {
    ...consentWithoutSig,
    digitalSignature: signature,
  };
}

/**
 * Serialize consent for blockchain logging
 */
export function serializeConsentForBlockchain(consent: ConsentRecord): string {
  return JSON.stringify({
    id: consent.id,
    patientId: consent.patientId,
    consentType: consent.consentType,
    scope: consent.scope,
    grantedAt: consent.grantedAt,
    signature: consent.digitalSignature,
  });
}
