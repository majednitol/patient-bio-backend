/**
 * Usability Testing Helpers
 * Pure logic simulation utilities for validating UX contracts.
 */

// --- Types ---

export interface JourneyStep {
  id: string;
  label: string;
  required: boolean;
  order: number;
  validationFn?: (data: Record<string, unknown>) => boolean;
}

export interface JourneyDefinition {
  id: string;
  portal: string;
  name: string;
  steps: JourneyStep[];
  hasProgressIndicator: boolean;
  supportsResume: boolean;
  completionMessage: string;
  timeoutSeconds?: number;
  timeoutMessage?: string;
}

export interface JourneyState {
  currentStepIndex: number;
  completedSteps: string[];
  skippedSteps: string[];
  data: Record<string, unknown>;
  status: 'in_progress' | 'completed' | 'timed_out' | 'abandoned';
}

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'password' | 'date' | 'select' | 'file';
  required: boolean;
  label: string;
  validationTrigger: 'blur' | 'submit' | 'change';
  validationRules?: ValidationRule[];
  defaultValue?: unknown;
  autoSave?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  message: string;
  params?: Record<string, unknown>;
}

export interface FormInteractionResult {
  field: string;
  validationFiredAt: 'blur' | 'submit' | 'change';
  errorMessage: string | null;
  isSpecificError: boolean;
  preservedValue: unknown;
}

export interface ErrorState {
  type: 'network' | '404' | 'timeout' | 'permission' | 'upload' | 'conflict' | 'session' | 'rate_limit' | 'offline' | 'validation' | 'critical' | 'boundary';
  message: string;
  hasRetry: boolean;
  hasActionableGuidance: boolean;
  preservesUserInput: boolean;
  usesPlainLanguage: boolean;
  retryConfig?: { backoffMs: number[]; showCountdown: boolean };
  actions?: string[];
}

export interface LoadingState {
  entity: string;
  type: 'skeleton' | 'spinner' | 'shimmer';
  matchesLayout: boolean;
  hasAnimation: boolean;
  timeoutMs: number;
  timeoutFallback: 'error' | 'retry' | 'message';
}

export interface EmptyState {
  entity: string;
  portal: string;
  message: string;
  ctaLabel: string;
  ctaAction: string;
  hasIcon: boolean;
  isFirstTime: boolean;
}

export interface NavigationNode {
  path: string;
  label: string;
  children?: NavigationNode[];
  portal: string;
  hasBreadcrumb: boolean;
  documentTitle: string;
}

export interface NavigationPathResult {
  from: string;
  to: string;
  hops: string[];
  clickDepth: number;
  withinLimit: boolean;
}

// --- Journey Simulation ---

export function simulateUserJourney(
  journey: JourneyDefinition,
  actions: { stepId: string; action: 'complete' | 'skip' | 'back'; data?: Record<string, unknown> }[]
): JourneyState {
  const state: JourneyState = {
    currentStepIndex: 0,
    completedSteps: [],
    skippedSteps: [],
    data: {},
    status: 'in_progress',
  };

  for (const action of actions) {
    const step = journey.steps.find(s => s.id === action.stepId);
    if (!step) continue;

    if (action.action === 'complete') {
      state.completedSteps.push(step.id);
      if (action.data) Object.assign(state.data, action.data);
      state.currentStepIndex = Math.min(state.currentStepIndex + 1, journey.steps.length - 1);
    } else if (action.action === 'skip') {
      if (!step.required) {
        state.skippedSteps.push(step.id);
        state.currentStepIndex = Math.min(state.currentStepIndex + 1, journey.steps.length - 1);
      }
    } else if (action.action === 'back') {
      state.currentStepIndex = Math.max(0, state.currentStepIndex - 1);
    }
  }

  const allRequired = journey.steps.filter(s => s.required).map(s => s.id);
  const allRequiredCompleted = allRequired.every(id => state.completedSteps.includes(id));
  const allStepsHandled = journey.steps.every(
    s => state.completedSteps.includes(s.id) || state.skippedSteps.includes(s.id)
  );

  if (allRequiredCompleted && allStepsHandled) {
    state.status = 'completed';
  }

  return state;
}

export function canResumeJourney(state: JourneyState, journey: JourneyDefinition): { canResume: boolean; resumeStepIndex: number } {
  if (state.status === 'completed') return { canResume: false, resumeStepIndex: -1 };
  const lastCompletedIndex = journey.steps.findIndex(
    s => !state.completedSteps.includes(s.id) && !state.skippedSteps.includes(s.id)
  );
  return { canResume: true, resumeStepIndex: lastCompletedIndex >= 0 ? lastCompletedIndex : 0 };
}

export function simulateJourneyTimeout(journey: JourneyDefinition): { showsMessage: boolean; message: string; canResume: boolean } {
  return {
    showsMessage: !!journey.timeoutMessage,
    message: journey.timeoutMessage || 'Your session has timed out.',
    canResume: journey.supportsResume,
  };
}

// --- Form Simulation ---

export function simulateFormInteraction(
  fields: FormField[],
  inputs: { field: string; value: unknown; event: 'blur' | 'change' | 'submit' }[]
): FormInteractionResult[] {
  const results: FormInteractionResult[] = [];

  for (const input of inputs) {
    const field = fields.find(f => f.name === input.field);
    if (!field) continue;

    const shouldValidate = field.validationTrigger === input.event;
    let errorMessage: string | null = null;

    if (shouldValidate && field.validationRules) {
      for (const rule of field.validationRules) {
        if (rule.type === 'required' && (!input.value || input.value === '')) {
          errorMessage = rule.message;
          break;
        }
        if (rule.type === 'email' && typeof input.value === 'string' && !input.value.includes('@')) {
          errorMessage = rule.message;
          break;
        }
        if (rule.type === 'minLength' && typeof input.value === 'string' && input.value.length < (rule.params?.min as number || 0)) {
          errorMessage = rule.message;
          break;
        }
      }
    }

    const isSpecific = errorMessage
      ? !['Invalid input', 'Error', 'Something went wrong', 'Invalid'].includes(errorMessage)
      : true;

    results.push({
      field: input.field,
      validationFiredAt: shouldValidate ? input.event : 'submit',
      errorMessage,
      isSpecificError: isSpecific,
      preservedValue: input.value,
    });
  }

  return results;
}

export function assessPasswordStrength(password: string): { score: number; label: string; criteria: { met: boolean; description: string }[] } {
  const criteria = [
    { met: password.length >= 8, description: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), description: 'Contains uppercase letter' },
    { met: /[a-z]/.test(password), description: 'Contains lowercase letter' },
    { met: /[0-9]/.test(password), description: 'Contains number' },
    { met: /[^A-Za-z0-9]/.test(password), description: 'Contains special character' },
  ];
  const score = criteria.filter(c => c.met).length;
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return { score, label: labels[Math.max(0, score - 1)] || 'Very Weak', criteria };
}

export function normalizePhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+88${digits}`;
  }
  if (digits.length === 13 && digits.startsWith('880')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

// --- Error State Simulation ---

export function simulateErrorRecovery(
  errorType: ErrorState['type'],
  retryCount: number = 0
): ErrorState {
  const errorMap: Record<ErrorState['type'], ErrorState> = {
    network: {
      type: 'network',
      message: 'Check your internet connection and try again.',
      hasRetry: true,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      retryConfig: { backoffMs: [1000, 2000, 4000], showCountdown: true },
      actions: ['Retry', 'Go Offline'],
    },
    '404': {
      type: '404',
      message: 'This page doesn\'t exist. Here are some pages you might be looking for.',
      hasRetry: false,
      hasActionableGuidance: true,
      preservesUserInput: false,
      usesPlainLanguage: true,
      actions: ['Go to Dashboard', 'Go to Home', 'Search'],
    },
    timeout: {
      type: 'timeout',
      message: 'The server is taking longer than expected. Please try again in a moment.',
      hasRetry: true,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      retryConfig: { backoffMs: [2000, 5000, 10000], showCountdown: true },
      actions: ['Try Again'],
    },
    permission: {
      type: 'permission',
      message: 'You don\'t have permission to access this resource. Contact your administrator for access.',
      hasRetry: false,
      hasActionableGuidance: true,
      preservesUserInput: false,
      usesPlainLanguage: true,
      actions: ['Request Access', 'Go Back'],
    },
    upload: {
      type: 'upload',
      message: 'File upload failed.',
      hasRetry: true,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      actions: ['Try Again', 'Choose Different File'],
    },
    conflict: {
      type: 'conflict',
      message: 'This record was modified by someone else. Review the changes and decide which version to keep.',
      hasRetry: false,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      actions: ['Keep Mine', 'Keep Theirs', 'Merge'],
    },
    session: {
      type: 'session',
      message: 'Your session has expired. Please log in again to continue.',
      hasRetry: false,
      hasActionableGuidance: true,
      preservesUserInput: false,
      usesPlainLanguage: true,
      actions: ['Log In'],
    },
    rate_limit: {
      type: 'rate_limit',
      message: 'Too many requests. Please wait before trying again.',
      hasRetry: true,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      retryConfig: { backoffMs: [30000, 60000], showCountdown: true },
      actions: ['Wait'],
    },
    offline: {
      type: 'offline',
      message: 'You\'re offline. Some data may be available from cache.',
      hasRetry: false,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      actions: ['View Cached Data', 'Retry When Online'],
    },
    validation: {
      type: 'validation',
      message: 'Please fix the errors highlighted below.',
      hasRetry: false,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      actions: ['Fix Errors'],
    },
    critical: {
      type: 'critical',
      message: 'A critical error occurred that may affect your data. Please acknowledge before proceeding.',
      hasRetry: false,
      hasActionableGuidance: true,
      preservesUserInput: true,
      usesPlainLanguage: true,
      actions: ['I Understand', 'Report Issue'],
    },
    boundary: {
      type: 'boundary',
      message: 'Something unexpected happened in this section.',
      hasRetry: true,
      hasActionableGuidance: true,
      preservesUserInput: false,
      usesPlainLanguage: true,
      actions: ['Report Issue', 'Go Home', 'Try Again'],
    },
  };

  const error = { ...errorMap[errorType] };
  if (error.retryConfig && retryCount > 0) {
    const idx = Math.min(retryCount - 1, error.retryConfig.backoffMs.length - 1);
    error.retryConfig.backoffMs = error.retryConfig.backoffMs.slice(idx);
  }
  return error;
}

export function getUploadErrorMessage(reason: 'size' | 'format' | 'network'): string {
  const messages: Record<string, string> = {
    size: 'File is too large. Maximum allowed size is 10MB.',
    format: 'Unsupported file format. Please upload PDF, JPG, or PNG files.',
    network: 'Upload failed due to network issues. Please check your connection and try again.',
  };
  return messages[reason];
}

// --- Loading & Empty State Simulation ---

export function assessLoadingState(entity: string): LoadingState {
  const configs: Record<string, LoadingState> = {
    dashboard_cards: { entity: 'dashboard_cards', type: 'skeleton', matchesLayout: true, hasAnimation: true, timeoutMs: 30000, timeoutFallback: 'retry' },
    table: { entity: 'table', type: 'skeleton', matchesLayout: true, hasAnimation: true, timeoutMs: 30000, timeoutFallback: 'retry' },
    profile: { entity: 'profile', type: 'skeleton', matchesLayout: true, hasAnimation: true, timeoutMs: 30000, timeoutFallback: 'error' },
    list: { entity: 'list', type: 'shimmer', matchesLayout: true, hasAnimation: true, timeoutMs: 30000, timeoutFallback: 'retry' },
    page: { entity: 'page', type: 'spinner', matchesLayout: false, hasAnimation: true, timeoutMs: 30000, timeoutFallback: 'error' },
  };
  return configs[entity] || { entity, type: 'spinner', matchesLayout: false, hasAnimation: true, timeoutMs: 30000, timeoutFallback: 'error' };
}

export function assessEmptyState(entity: string, portal: string, isFirstTime: boolean = false): EmptyState {
  const emptyStates: Record<string, Partial<EmptyState>> = {
    'patient:patients': { message: 'Add your first patient', ctaLabel: 'Add Patient', ctaAction: '/doctor/patients/new', hasIcon: true },
    'patient:appointments': { message: 'Schedule an appointment', ctaLabel: 'Book Appointment', ctaAction: '/dashboard/appointments/new', hasIcon: true },
    'patient:records': { message: 'Upload your first record', ctaLabel: 'Upload Record', ctaAction: '/dashboard/upload', hasIcon: true },
    'patient:notifications': { message: 'All caught up! No new notifications.', ctaLabel: 'View Settings', ctaAction: '/dashboard/settings', hasIcon: true },
    'doctor:patients': { message: 'No patients yet', ctaLabel: 'Add Patient', ctaAction: '/doctor/patients/new', hasIcon: true },
    'doctor:appointments': { message: 'No upcoming appointments', ctaLabel: 'View Schedule', ctaAction: '/doctor/schedule', hasIcon: true },
    'hospital:admissions': { message: 'No active admissions', ctaLabel: 'Admit Patient', ctaAction: '/hospital/admissions/new', hasIcon: true },
    'researcher:datasets': { message: 'No datasets available', ctaLabel: 'Request Data', ctaAction: '/researcher/requests/new', hasIcon: true },
    'pathologist:reports': { message: 'No pending reports', ctaLabel: 'View History', ctaAction: '/pathologist/reports', hasIcon: true },
    'pharma:trials': { message: 'No active trials', ctaLabel: 'Create Trial', ctaAction: '/pharma/trials/new', hasIcon: true },
    'admin:users': { message: 'No users found', ctaLabel: 'Invite User', ctaAction: '/admin/users/invite', hasIcon: true },
    'search:results': { message: 'No results found. Try different keywords.', ctaLabel: 'Clear Search', ctaAction: 'clear', hasIcon: true },
  };

  const key = `${portal}:${entity}`;
  const base = emptyStates[key] || emptyStates[`search:${entity}`] || {
    message: `No ${entity} found`,
    ctaLabel: 'Go Back',
    ctaAction: 'back',
    hasIcon: true,
  };

  return {
    entity,
    portal,
    isFirstTime,
    message: isFirstTime ? `Welcome! ${base.message}` : base.message!,
    ctaLabel: base.ctaLabel!,
    ctaAction: base.ctaAction!,
    hasIcon: base.hasIcon!,
  };
}

// --- Navigation Simulation ---

const PORTAL_NAV_TREES: Record<string, NavigationNode> = {
  patient: {
    path: '/dashboard', label: 'Dashboard', portal: 'patient', hasBreadcrumb: false, documentTitle: 'Dashboard | Patient Bio',
    children: [
      { path: '/dashboard/records', label: 'Records', portal: 'patient', hasBreadcrumb: true, documentTitle: 'Records | Patient Bio' },
      { path: '/dashboard/upload', label: 'Upload', portal: 'patient', hasBreadcrumb: true, documentTitle: 'Upload | Patient Bio' },
      { path: '/dashboard/appointments', label: 'Appointments', portal: 'patient', hasBreadcrumb: true, documentTitle: 'Appointments | Patient Bio',
        children: [
          { path: '/dashboard/appointments/new', label: 'Book Appointment', portal: 'patient', hasBreadcrumb: true, documentTitle: 'Book Appointment | Patient Bio' },
        ],
      },
      { path: '/dashboard/sharing', label: 'Sharing', portal: 'patient', hasBreadcrumb: true, documentTitle: 'Data Sharing | Patient Bio' },
      { path: '/dashboard/settings', label: 'Settings', portal: 'patient', hasBreadcrumb: true, documentTitle: 'Settings | Patient Bio' },
    ],
  },
  doctor: {
    path: '/doctor', label: 'Dashboard', portal: 'doctor', hasBreadcrumb: false, documentTitle: 'Doctor Dashboard | Patient Bio',
    children: [
      { path: '/doctor/patients', label: 'Patients', portal: 'doctor', hasBreadcrumb: true, documentTitle: 'Patients | Patient Bio' },
      { path: '/doctor/schedule', label: 'Schedule', portal: 'doctor', hasBreadcrumb: true, documentTitle: 'Schedule | Patient Bio' },
      { path: '/doctor/prescriptions', label: 'Prescriptions', portal: 'doctor', hasBreadcrumb: true, documentTitle: 'Prescriptions | Patient Bio' },
      { path: '/doctor/analytics', label: 'Analytics', portal: 'doctor', hasBreadcrumb: true, documentTitle: 'Analytics | Patient Bio' },
    ],
  },
  hospital: {
    path: '/hospital', label: 'Dashboard', portal: 'hospital', hasBreadcrumb: false, documentTitle: 'Hospital Dashboard | Patient Bio',
    children: [
      { path: '/hospital/admissions', label: 'Admissions', portal: 'hospital', hasBreadcrumb: true, documentTitle: 'Admissions | Patient Bio' },
      { path: '/hospital/wards', label: 'Wards', portal: 'hospital', hasBreadcrumb: true, documentTitle: 'Wards | Patient Bio' },
      { path: '/hospital/staff', label: 'Staff', portal: 'hospital', hasBreadcrumb: true, documentTitle: 'Staff | Patient Bio' },
    ],
  },
  researcher: {
    path: '/researcher', label: 'Dashboard', portal: 'researcher', hasBreadcrumb: false, documentTitle: 'Researcher Dashboard | Patient Bio',
    children: [
      { path: '/researcher/datasets', label: 'Datasets', portal: 'researcher', hasBreadcrumb: true, documentTitle: 'Datasets | Patient Bio' },
      { path: '/researcher/requests', label: 'Requests', portal: 'researcher', hasBreadcrumb: true, documentTitle: 'Requests | Patient Bio' },
    ],
  },
  pathologist: {
    path: '/pathologist', label: 'Dashboard', portal: 'pathologist', hasBreadcrumb: false, documentTitle: 'Pathologist Dashboard | Patient Bio',
    children: [
      { path: '/pathologist/reports', label: 'Reports', portal: 'pathologist', hasBreadcrumb: true, documentTitle: 'Reports | Patient Bio' },
    ],
  },
  pharma: {
    path: '/pharma', label: 'Dashboard', portal: 'pharma', hasBreadcrumb: false, documentTitle: 'Pharma Dashboard | Patient Bio',
    children: [
      { path: '/pharma/trials', label: 'Trials', portal: 'pharma', hasBreadcrumb: true, documentTitle: 'Trials | Patient Bio' },
    ],
  },
  admin: {
    path: '/admin', label: 'Dashboard', portal: 'admin', hasBreadcrumb: false, documentTitle: 'Admin Dashboard | Patient Bio',
    children: [
      { path: '/admin/users', label: 'Users', portal: 'admin', hasBreadcrumb: true, documentTitle: 'Users | Patient Bio' },
      { path: '/admin/settings', label: 'Settings', portal: 'admin', hasBreadcrumb: true, documentTitle: 'Settings | Patient Bio' },
    ],
  },
};

export function getPortalNavTree(portal: string): NavigationNode | undefined {
  return PORTAL_NAV_TREES[portal];
}

export function simulateNavigationPath(from: string, to: string, portal: string): NavigationPathResult {
  const tree = PORTAL_NAV_TREES[portal];
  if (!tree) return { from, to, hops: [], clickDepth: Infinity, withinLimit: false };

  const allNodes = flattenNavTree(tree);
  const toNode = allNodes.find(n => n.path === to);

  if (!toNode) return { from, to, hops: [], clickDepth: Infinity, withinLimit: false };

  const path = findPath(tree, to, []);
  const hops = path.map(n => n.path);
  const clickDepth = hops.length;

  return { from, to, hops, clickDepth, withinLimit: clickDepth <= 3 };
}

function flattenNavTree(node: NavigationNode): NavigationNode[] {
  const result: NavigationNode[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenNavTree(child));
    }
  }
  return result;
}

function findPath(node: NavigationNode, target: string, currentPath: NavigationNode[]): NavigationNode[] {
  const newPath = [...currentPath, node];
  if (node.path === target) return newPath;
  if (node.children) {
    for (const child of node.children) {
      const result = findPath(child, target, newPath);
      if (result.length > 0 && result[result.length - 1].path === target) return result;
    }
  }
  return [];
}

export function getNodeAtPath(portal: string, path: string): NavigationNode | undefined {
  const tree = PORTAL_NAV_TREES[portal];
  if (!tree) return undefined;
  return flattenNavTree(tree).find(n => n.path === path);
}

export function getAllPortals(): string[] {
  return Object.keys(PORTAL_NAV_TREES);
}

export function getMobileNavItems(portal: string): string[] {
  const mobileNav: Record<string, string[]> = {
    patient: ['Dashboard', 'Records', 'Appointments', 'Sharing', 'Settings'],
    doctor: ['Dashboard', 'Patients', 'Schedule', 'Prescriptions', 'Analytics'],
    hospital: ['Dashboard', 'Admissions', 'Wards', 'Staff'],
    researcher: ['Dashboard', 'Datasets', 'Requests'],
    pathologist: ['Dashboard', 'Reports'],
    pharma: ['Dashboard', 'Trials'],
    admin: ['Dashboard', 'Users', 'Settings'],
  };
  return mobileNav[portal] || [];
}

// --- Journey Definitions ---

export const JOURNEYS: Record<string, JourneyDefinition> = {
  patient_onboarding: {
    id: 'patient_onboarding', portal: 'patient', name: 'Patient Onboarding',
    steps: [
      { id: 'set_name', label: 'Set your display name', required: false, order: 0 },
      { id: 'blood_group', label: 'Your blood group', required: false, order: 1 },
      { id: 'upload_record', label: 'Upload your first record', required: false, order: 2 },
    ],
    hasProgressIndicator: true, supportsResume: true, completionMessage: 'Welcome to Patient Bio!',
    timeoutSeconds: 300, timeoutMessage: 'No worries! You can complete setup later from Settings.',
  },
  doctor_onboarding: {
    id: 'doctor_onboarding', portal: 'doctor', name: 'Doctor Onboarding',
    steps: [
      { id: 'profile', label: 'Complete your profile', required: true, order: 0 },
      { id: 'clinic_setup', label: 'Set up your clinic', required: true, order: 1 },
      { id: 'availability', label: 'Set your availability', required: true, order: 2 },
    ],
    hasProgressIndicator: true, supportsResume: true, completionMessage: 'Your practice is ready!',
    timeoutSeconds: 600, timeoutMessage: 'You can finish setting up your profile from the Settings page.',
  },
  data_sharing: {
    id: 'data_sharing', portal: 'patient', name: 'Share Health Data',
    steps: [
      { id: 'select_recipient', label: 'Select recipient', required: true, order: 0 },
      { id: 'choose_records', label: 'Choose records to share', required: true, order: 1 },
      { id: 'set_expiry', label: 'Set access expiry', required: true, order: 2 },
      { id: 'confirm', label: 'Review and confirm', required: true, order: 3 },
    ],
    hasProgressIndicator: true, supportsResume: false, completionMessage: 'Data shared successfully!',
  },
  prescription_creation: {
    id: 'prescription_creation', portal: 'doctor', name: 'Create Prescription',
    steps: [
      { id: 'select_patient', label: 'Select patient', required: true, order: 0 },
      { id: 'add_medications', label: 'Add medications', required: true, order: 1 },
      { id: 'review', label: 'Review prescription', required: true, order: 2 },
      { id: 'submit', label: 'Submit', required: true, order: 3 },
    ],
    hasProgressIndicator: true, supportsResume: false, completionMessage: 'Prescription created!',
  },
  appointment_booking: {
    id: 'appointment_booking', portal: 'patient', name: 'Book Appointment',
    steps: [
      { id: 'pick_doctor', label: 'Pick a doctor', required: true, order: 0 },
      { id: 'choose_slot', label: 'Choose a time slot', required: true, order: 1 },
      { id: 'confirm', label: 'Confirm booking', required: true, order: 2 },
      { id: 'summary', label: 'View booking summary', required: true, order: 3 },
    ],
    hasProgressIndicator: true, supportsResume: false, completionMessage: 'Appointment booked!',
  },
  hospital_admission: {
    id: 'hospital_admission', portal: 'hospital', name: 'Admit Patient',
    steps: [
      { id: 'search_patient', label: 'Search patient', required: true, order: 0 },
      { id: 'assign_bed', label: 'Assign bed', required: true, order: 1 },
      { id: 'record_vitals', label: 'Record vitals', required: true, order: 2 },
      { id: 'confirm', label: 'Confirm admission', required: true, order: 3 },
    ],
    hasProgressIndicator: true, supportsResume: false, completionMessage: 'Patient admitted successfully!',
  },
  lab_report_upload: {
    id: 'lab_report_upload', portal: 'pathologist', name: 'Upload Lab Report',
    steps: [
      { id: 'select_type', label: 'Select report type', required: true, order: 0 },
      { id: 'upload_file', label: 'Upload file', required: true, order: 1 },
      { id: 'tag_patient', label: 'Tag patient', required: true, order: 2 },
      { id: 'submit', label: 'Submit report', required: true, order: 3 },
    ],
    hasProgressIndicator: true, supportsResume: false, completionMessage: 'Report uploaded!',
  },
  emergency_access: {
    id: 'emergency_access', portal: 'patient', name: 'Emergency Access',
    steps: [
      { id: 'scan_qr', label: 'Scan QR code', required: true, order: 0 },
      { id: 'enter_pin', label: 'Enter PIN', required: true, order: 1 },
      { id: 'view_data', label: 'View limited data', required: true, order: 2 },
      { id: 'auto_expire', label: 'Access expires automatically', required: true, order: 3 },
    ],
    hasProgressIndicator: true, supportsResume: false, completionMessage: 'Emergency access granted.',
    timeoutSeconds: 300, timeoutMessage: 'Emergency access has expired for security.',
  },
};

export function getPortalJourneys(portal: string): JourneyDefinition[] {
  return Object.values(JOURNEYS).filter(j => j.portal === portal);
}
