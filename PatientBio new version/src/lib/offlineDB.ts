import { openDB, DBSchema, IDBPDatabase } from "idb";

// Define the database schema
interface PatientBioDBSchema extends DBSchema {
  healthData: {
    key: string;
    value: {
      id: string;
      userId: string;
      bloodGroup: string | null;
      healthAllergies: string | null;
      currentMedications: string | null;
      chronicDiseases: string | null;
      emergencyContactName: string | null;
      emergencyContactPhone: string | null;
      height: string | null;
      updatedAt: string;
      cachedAt: string;
    };
  };
  userProfile: {
    key: string;
    value: {
      id: string;
      userId: string;
      displayName: string | null;
      dateOfBirth: string | null;
      gender: string | null;
      location: string | null;
      phone: string | null;
      patientPassportId: string | null;
      avatarUrl: string | null;
      updatedAt: string;
      cachedAt: string;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      actionType: "update_profile" | "update_health_data" | "upload_record" | "submit_intake" | "add_health_metric";
      payload: Record<string, unknown>;
      createdAt: string;
      attempts: number;
    };
    indexes: { "by-created": string };
  };
  offlineMetadata: {
    key: string;
    value: {
      key: string;
      lastSyncAt: string | null;
      isOfflineMode: boolean;
    };
  };
  // V2: Cached health records for offline viewing
  cachedRecords: {
    key: string;
    value: {
      id: string;
      userId: string;
      title: string;
      category: string | null;
      diseaseCategory: string | null;
      providerName: string | null;
      recordDate: string | null;
      fileType: string | null;
      createdAt: string;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
  // V2: Cached appointments for offline viewing
  cachedAppointments: {
    key: string;
    value: {
      id: string;
      userId: string;
      doctorName: string | null;
      doctorSpecialty: string | null;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      status: string | null;
      reason: string | null;
      hospitalName: string | null;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
  // V4: New stores
  cachedDoctorConnections: {
    key: string;
    value: {
      id: string;
      userId: string;
      doctorName: string;
      specialty: string | null;
      hospitalClinic: string | null;
      phone: string | null;
      email: string | null;
      notes: string | null;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
  cachedHealthMetrics: {
    key: string;
    value: {
      id: string;
      userId: string;
      metricType: string;
      value: number;
      unit: string;
      measuredAt: string;
      source: string;
      notes: string | null;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
  cachedWallet: {
    key: string;
    value: {
      userId: string;
      walletAddress: string | null;
      tokenBalance: number;
      totalEarned: number;
      totalWithdrawn: number;
      transactions: Array<{
        id: string;
        requesterType: string;
        tokensEarned: number;
        diseaseCategory: string | null;
        createdAt: string;
      }>;
      cachedAt: string;
    };
  };
  cachedNotifications: {
    key: string;
    value: {
      id: string;
      userId: string;
      type: string;
      title: string;
      message: string | null;
      isRead: boolean;
      createdAt: string;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
  cachedFamilyMembers: {
    key: string;
    value: {
      id: string;
      userId: string;
      accountHolderId: string;
      patientId: string;
      relationship: string;
      isPrimary: boolean;
      canManageRecords: boolean;
      canShareData: boolean;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
  // V5: Prescriptions and Consent Records
  cachedPrescriptions: {
    key: string;
    value: {
      id: string;
      userId: string;
      diagnosis: string | null;
      medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string;
      }>;
      doctorName: string | null;
      doctorSpecialty: string | null;
      isActive: boolean;
      createdAt: string;
      followUpDate: string | null;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
  cachedConsentRecords: {
    key: string;
    value: {
      id: string;
      userId: string;
      consentType: string;
      grantedToType: string | null;
      purpose: string;
      scope: string[];
      isActive: boolean;
      grantedAt: string | null;
      expiresAt: string | null;
      cachedAt: string;
    };
    indexes: { "by-user": string };
  };
}

const DB_NAME = "patient-bio-offline";
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<PatientBioDBSchema>> | null = null;

// Initialize the database
export const initOfflineDB = async (): Promise<IDBPDatabase<PatientBioDBSchema>> => {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<PatientBioDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // V1 stores
      if (!db.objectStoreNames.contains("healthData")) {
        db.createObjectStore("healthData", { keyPath: "userId" });
      }
      if (!db.objectStoreNames.contains("userProfile")) {
        db.createObjectStore("userProfile", { keyPath: "userId" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
        syncStore.createIndex("by-created", "createdAt");
      }
      if (!db.objectStoreNames.contains("offlineMetadata")) {
        db.createObjectStore("offlineMetadata", { keyPath: "key" });
      }

      // V2 stores
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("cachedRecords")) {
          const recordsStore = db.createObjectStore("cachedRecords", { keyPath: "id" });
          recordsStore.createIndex("by-user", "userId");
        }
        if (!db.objectStoreNames.contains("cachedAppointments")) {
          const apptStore = db.createObjectStore("cachedAppointments", { keyPath: "id" });
          apptStore.createIndex("by-user", "userId");
        }
      }

      // V3: No new stores needed — intake forms use syncQueue with actionType "submit_intake"

      // V4: New stores for expanded offline mode
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains("cachedDoctorConnections")) {
          const docStore = db.createObjectStore("cachedDoctorConnections", { keyPath: "id" });
          docStore.createIndex("by-user", "userId");
        }
        if (!db.objectStoreNames.contains("cachedHealthMetrics")) {
          const metricsStore = db.createObjectStore("cachedHealthMetrics", { keyPath: "id" });
          metricsStore.createIndex("by-user", "userId");
        }
        if (!db.objectStoreNames.contains("cachedWallet")) {
          db.createObjectStore("cachedWallet", { keyPath: "userId" });
        }
        if (!db.objectStoreNames.contains("cachedNotifications")) {
          const notifStore = db.createObjectStore("cachedNotifications", { keyPath: "id" });
          notifStore.createIndex("by-user", "userId");
        }
        if (!db.objectStoreNames.contains("cachedFamilyMembers")) {
          const famStore = db.createObjectStore("cachedFamilyMembers", { keyPath: "id" });
          famStore.createIndex("by-user", "userId");
        }
      }

      // V5: Prescriptions and Consent Records
      if (oldVersion < 5) {
        if (!db.objectStoreNames.contains("cachedPrescriptions")) {
          const rxStore = db.createObjectStore("cachedPrescriptions", { keyPath: "id" });
          rxStore.createIndex("by-user", "userId");
        }
        if (!db.objectStoreNames.contains("cachedConsentRecords")) {
          const consentStore = db.createObjectStore("cachedConsentRecords", { keyPath: "id" });
          consentStore.createIndex("by-user", "userId");
        }
      }
    },
  });

  return dbPromise;
};

// ── Health Data ──

export const cacheHealthData = async (
  userId: string,
  data: {
    id?: string;
    bloodGroup?: string | null;
    healthAllergies?: string | null;
    currentMedications?: string | null;
    chronicDiseases?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    height?: string | null;
    updatedAt?: string;
  }
): Promise<void> => {
  const db = await initOfflineDB();
  await db.put("healthData", {
    id: data.id || crypto.randomUUID(),
    userId,
    bloodGroup: data.bloodGroup || null,
    healthAllergies: data.healthAllergies || null,
    currentMedications: data.currentMedications || null,
    chronicDiseases: data.chronicDiseases || null,
    emergencyContactName: data.emergencyContactName || null,
    emergencyContactPhone: data.emergencyContactPhone || null,
    height: data.height || null,
    updatedAt: data.updatedAt || new Date().toISOString(),
    cachedAt: new Date().toISOString(),
  });
};

export const getCachedHealthData = async (userId: string) => {
  const db = await initOfflineDB();
  return db.get("healthData", userId);
};

// ── User Profile ──

export const cacheUserProfile = async (
  userId: string,
  data: {
    id?: string;
    displayName?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    location?: string | null;
    phone?: string | null;
    patientPassportId?: string | null;
    avatarUrl?: string | null;
    updatedAt?: string;
  }
): Promise<void> => {
  const db = await initOfflineDB();
  await db.put("userProfile", {
    id: data.id || crypto.randomUUID(),
    userId,
    displayName: data.displayName || null,
    dateOfBirth: data.dateOfBirth || null,
    gender: data.gender || null,
    location: data.location || null,
    phone: data.phone || null,
    patientPassportId: data.patientPassportId || null,
    avatarUrl: data.avatarUrl || null,
    updatedAt: data.updatedAt || new Date().toISOString(),
    cachedAt: new Date().toISOString(),
  });
};

export const getCachedUserProfile = async (userId: string) => {
  const db = await initOfflineDB();
  return db.get("userProfile", userId);
};

// ── Sync Queue ──

export const addToSyncQueue = async (
  actionType: "update_profile" | "update_health_data" | "upload_record" | "submit_intake" | "add_health_metric",
  payload: Record<string, unknown>
): Promise<void> => {
  const db = await initOfflineDB();
  await db.add("syncQueue", {
    id: crypto.randomUUID(),
    actionType,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
};

export const getPendingSyncItems = async () => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("syncQueue", "by-created");
};

export const removeFromSyncQueue = async (id: string): Promise<void> => {
  const db = await initOfflineDB();
  await db.delete("syncQueue", id);
};

export const incrementSyncAttempts = async (id: string): Promise<void> => {
  const db = await initOfflineDB();
  const item = await db.get("syncQueue", id);
  if (item) {
    await db.put("syncQueue", { ...item, attempts: item.attempts + 1 });
  }
};

// ── Metadata ──

export const updateLastSyncTime = async (): Promise<void> => {
  const db = await initOfflineDB();
  await db.put("offlineMetadata", {
    key: "sync",
    lastSyncAt: new Date().toISOString(),
    isOfflineMode: !navigator.onLine,
  });
};

export const getLastSyncTime = async (): Promise<string | null> => {
  const db = await initOfflineDB();
  const metadata = await db.get("offlineMetadata", "sync");
  return metadata?.lastSyncAt || null;
};

export const clearOfflineData = async (): Promise<void> => {
  const db = await initOfflineDB();
  await Promise.all([
    db.clear("healthData"),
    db.clear("userProfile"),
    db.clear("syncQueue"),
    db.clear("offlineMetadata"),
    db.clear("cachedRecords"),
    db.clear("cachedAppointments"),
    db.clear("cachedDoctorConnections"),
    db.clear("cachedHealthMetrics"),
    db.clear("cachedWallet"),
    db.clear("cachedNotifications"),
    db.clear("cachedFamilyMembers"),
    db.clear("cachedPrescriptions"),
    db.clear("cachedConsentRecords"),
  ]);
};

// ── V2: Health Records Cache ──

export interface CachedRecord {
  id: string;
  userId: string;
  title: string;
  category: string | null;
  diseaseCategory: string | null;
  providerName: string | null;
  recordDate: string | null;
  fileType: string | null;
  createdAt: string;
  cachedAt: string;
}

export const cacheHealthRecords = async (userId: string, records: Array<{
  id: string;
  title: string;
  category?: string | null;
  disease_category?: string | null;
  provider_name?: string | null;
  record_date?: string | null;
  file_type?: string | null;
  created_at?: string;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedRecords", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const r of records) {
    await tx.store.put({
      id: r.id,
      userId,
      title: r.title,
      category: r.category || null,
      diseaseCategory: r.disease_category || null,
      providerName: r.provider_name || null,
      recordDate: r.record_date || null,
      fileType: r.file_type || null,
      createdAt: r.created_at || now,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedHealthRecords = async (userId: string): Promise<CachedRecord[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedRecords", "by-user", userId);
};

// ── V2: Appointments Cache ──

export interface CachedAppointment {
  id: string;
  userId: string;
  doctorName: string | null;
  doctorSpecialty: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string | null;
  reason: string | null;
  hospitalName: string | null;
  cachedAt: string;
}

export const cacheAppointments = async (userId: string, appointments: Array<{
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status?: string | null;
  reason?: string | null;
  doctor_profile?: { full_name?: string | null; specialty?: string | null } | null;
  hospital?: { name?: string | null } | null;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedAppointments", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const a of appointments) {
    await tx.store.put({
      id: a.id,
      userId,
      doctorName: a.doctor_profile?.full_name || null,
      doctorSpecialty: a.doctor_profile?.specialty || null,
      appointmentDate: a.appointment_date,
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status || null,
      reason: a.reason || null,
      hospitalName: a.hospital?.name || null,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedAppointments = async (userId: string): Promise<CachedAppointment[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedAppointments", "by-user", userId);
};

// ── V4: Doctor Connections Cache ──

export interface CachedDoctorConnection {
  id: string;
  userId: string;
  doctorName: string;
  specialty: string | null;
  hospitalClinic: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  cachedAt: string;
}

export const cacheDoctorConnections = async (userId: string, doctors: Array<{
  id: string;
  doctor_name: string;
  specialty?: string | null;
  hospital_clinic?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedDoctorConnections", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const d of doctors) {
    await tx.store.put({
      id: d.id,
      userId,
      doctorName: d.doctor_name,
      specialty: d.specialty || null,
      hospitalClinic: d.hospital_clinic || null,
      phone: d.phone || null,
      email: d.email || null,
      notes: d.notes || null,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedDoctorConnections = async (userId: string): Promise<CachedDoctorConnection[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedDoctorConnections", "by-user", userId);
};

// ── V4: Health Metrics Cache ──

export interface CachedHealthMetric {
  id: string;
  userId: string;
  metricType: string;
  value: number;
  unit: string;
  measuredAt: string;
  source: string;
  notes: string | null;
  cachedAt: string;
}

export const cacheHealthMetrics = async (userId: string, metrics: Array<{
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  measured_at: string;
  source: string;
  notes?: string | null;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedHealthMetrics", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const m of metrics) {
    await tx.store.put({
      id: m.id,
      userId,
      metricType: m.metric_type,
      value: m.value,
      unit: m.unit,
      measuredAt: m.measured_at,
      source: m.source,
      notes: m.notes || null,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedHealthMetrics = async (userId: string): Promise<CachedHealthMetric[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedHealthMetrics", "by-user", userId);
};

// ── V4: Wallet Cache ──

export interface CachedWallet {
  userId: string;
  walletAddress: string | null;
  tokenBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  transactions: Array<{
    id: string;
    requesterType: string;
    tokensEarned: number;
    diseaseCategory: string | null;
    createdAt: string;
  }>;
  cachedAt: string;
}

export const cacheWalletData = async (userId: string, wallet: {
  wallet_address?: string | null;
  token_balance: number;
  total_earned: number;
  total_withdrawn: number;
}, transactions: Array<{
  id: string;
  requester_type: string;
  tokens_earned: number;
  disease_category?: string | null;
  created_at: string;
}>): Promise<void> => {
  const db = await initOfflineDB();
  await db.put("cachedWallet", {
    userId,
    walletAddress: wallet.wallet_address || null,
    tokenBalance: wallet.token_balance,
    totalEarned: wallet.total_earned,
    totalWithdrawn: wallet.total_withdrawn,
    transactions: transactions.map(t => ({
      id: t.id,
      requesterType: t.requester_type,
      tokensEarned: t.tokens_earned,
      diseaseCategory: t.disease_category || null,
      createdAt: t.created_at,
    })),
    cachedAt: new Date().toISOString(),
  });
};

export const getCachedWalletData = async (userId: string): Promise<CachedWallet | undefined> => {
  const db = await initOfflineDB();
  return db.get("cachedWallet", userId);
};

// ── V4: Notifications Cache ──

export interface CachedNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  cachedAt: string;
}

export const cacheNotifications = async (userId: string, notifications: Array<{
  id: string;
  type: string;
  title: string;
  message?: string | null;
  is_read: boolean;
  created_at: string;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedNotifications", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const n of notifications) {
    await tx.store.put({
      id: n.id,
      userId,
      type: n.type,
      title: n.title,
      message: n.message || null,
      isRead: n.is_read,
      createdAt: n.created_at,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedNotifications = async (userId: string): Promise<CachedNotification[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedNotifications", "by-user", userId);
};

// ── V4: Family Members Cache ──

export interface CachedFamilyMember {
  id: string;
  userId: string;
  accountHolderId: string;
  patientId: string;
  relationship: string;
  isPrimary: boolean;
  canManageRecords: boolean;
  canShareData: boolean;
  cachedAt: string;
}

export const cacheFamilyMembers = async (userId: string, members: Array<{
  id: string;
  account_holder_id: string;
  patient_id: string;
  relationship: string;
  is_primary: boolean;
  can_manage_records: boolean;
  can_share_data: boolean;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedFamilyMembers", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const m of members) {
    await tx.store.put({
      id: m.id,
      userId,
      accountHolderId: m.account_holder_id,
      patientId: m.patient_id,
      relationship: m.relationship,
      isPrimary: m.is_primary,
      canManageRecords: m.can_manage_records,
      canShareData: m.can_share_data,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedFamilyMembers = async (userId: string): Promise<CachedFamilyMember[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedFamilyMembers", "by-user", userId);
};

// ── Auto-pruning: remove cached records older than 30 days ──

export const pruneStaleCache = async (): Promise<number> => {
  const db = await initOfflineDB();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let pruned = 0;

  // Prune old cached records
  const allRecords = await db.getAll("cachedRecords");
  const tx1 = db.transaction("cachedRecords", "readwrite");
  for (const r of allRecords) {
    if (r.cachedAt < thirtyDaysAgo) {
      await tx1.store.delete(r.id);
      pruned++;
    }
  }
  await tx1.done;

  // Prune old cached appointments
  const allAppts = await db.getAll("cachedAppointments");
  const tx2 = db.transaction("cachedAppointments", "readwrite");
  for (const a of allAppts) {
    if (a.cachedAt < thirtyDaysAgo) {
      await tx2.store.delete(a.id);
      pruned++;
    }
  }
  await tx2.done;

  // Prune old cached metrics
  const allMetrics = await db.getAll("cachedHealthMetrics");
  const tx3 = db.transaction("cachedHealthMetrics", "readwrite");
  for (const m of allMetrics) {
    if (m.cachedAt < thirtyDaysAgo) {
      await tx3.store.delete(m.id);
      pruned++;
    }
  }
  await tx3.done;

  // Prune old cached notifications
  const allNotifs = await db.getAll("cachedNotifications");
  const tx4 = db.transaction("cachedNotifications", "readwrite");
  for (const n of allNotifs) {
    if (n.cachedAt < thirtyDaysAgo) {
      await tx4.store.delete(n.id);
      pruned++;
    }
  }
  await tx4.done;

  return pruned;
};

// ── V5: Prescriptions Cache ──

export interface CachedPrescription {
  id: string;
  userId: string;
  diagnosis: string | null;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  doctorName: string | null;
  doctorSpecialty: string | null;
  isActive: boolean;
  createdAt: string;
  followUpDate: string | null;
  cachedAt: string;
}

export const cachePrescriptions = async (userId: string, prescriptions: Array<{
  id: string;
  diagnosis?: string | null;
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
  doctor_name?: string | null;
  doctor_specialty?: string | null;
  is_active: boolean;
  created_at: string;
  follow_up_date?: string | null;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedPrescriptions", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const p of prescriptions) {
    await tx.store.put({
      id: p.id,
      userId,
      diagnosis: p.diagnosis || null,
      medications: p.medications,
      doctorName: p.doctor_name || null,
      doctorSpecialty: p.doctor_specialty || null,
      isActive: p.is_active,
      createdAt: p.created_at,
      followUpDate: p.follow_up_date || null,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedPrescriptions = async (userId: string): Promise<CachedPrescription[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedPrescriptions", "by-user", userId);
};

// ── V5: Consent Records Cache ──

export interface CachedConsentRecord {
  id: string;
  userId: string;
  consentType: string;
  grantedToType: string | null;
  purpose: string;
  scope: string[];
  isActive: boolean;
  grantedAt: string | null;
  expiresAt: string | null;
  cachedAt: string;
}

export const cacheConsentRecords = async (userId: string, consents: Array<{
  id: string;
  consent_type: string;
  granted_to_type?: string | null;
  purpose: string;
  scope?: unknown;
  is_active?: boolean | null;
  granted_at?: string | null;
  expires_at?: string | null;
}>): Promise<void> => {
  const db = await initOfflineDB();
  const tx = db.transaction("cachedConsentRecords", "readwrite");
  const now = new Date().toISOString();

  const existingKeys = await tx.store.index("by-user").getAllKeys(userId);
  for (const key of existingKeys) {
    await tx.store.delete(key);
  }

  for (const c of consents) {
    await tx.store.put({
      id: c.id,
      userId,
      consentType: c.consent_type,
      grantedToType: c.granted_to_type || null,
      purpose: c.purpose,
      scope: Array.isArray(c.scope) ? c.scope as string[] : [],
      isActive: c.is_active ?? true,
      grantedAt: c.granted_at || null,
      expiresAt: c.expires_at || null,
      cachedAt: now,
    });
  }
  await tx.done;
};

export const getCachedConsentRecords = async (userId: string): Promise<CachedConsentRecord[]> => {
  const db = await initOfflineDB();
  return db.getAllFromIndex("cachedConsentRecords", "by-user", userId);
};
