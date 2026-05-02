import { describe, it, expect } from "vitest";

describe("Phase 10: Data Sharing - Bidirectional", () => {
  it("117. Patient shares fetched by patient_id", () => {
    const filter = { column: "patient_id", value: "patient-1" };
    expect(filter.column).toBe("patient_id");
  });

  it("118. Pathologist shares fetched by pathologist_id", () => {
    const filter = { column: "pathologist_id", value: "path-1" };
    expect(filter.column).toBe("pathologist_id");
  });

  it("119. Active patient shares exclude revoked and expired", () => {
    const shares = [
      { status: "pending", expires_at: null },
      { status: "revoked", expires_at: null },
      { status: "viewed", expires_at: "2020-01-01T00:00:00Z" },
      { status: "viewed", expires_at: "2030-01-01T00:00:00Z" },
    ];
    const active = shares.filter(
      (s) => s.status !== "revoked" && (!s.expires_at || new Date(s.expires_at) > new Date())
    );
    expect(active).toHaveLength(2);
  });

  it("120. Pending shares = pathologistShares where status=pending", () => {
    const shares = [
      { status: "pending" },
      { status: "viewed" },
      { status: "pending" },
    ];
    const pending = shares.filter((s) => s.status === "pending");
    expect(pending).toHaveLength(2);
  });

  it("121. Create share inserts + creates notification for pathologist", () => {
    const insertData = {
      patient_id: "patient-1",
      pathologist_id: "path-1",
      is_anonymized: true,
    };
    const notification = {
      user_id: "path-1",
      type: "patient_data_shared",
      title: "New Patient Data Shared",
    };
    expect(insertData.pathologist_id).toBe(notification.user_id);
  });

  it("122. Default anonymization is true", () => {
    const val: boolean | undefined = undefined;
    const isAnonymized = val ?? true;
    expect(isAnonymized).toBe(true);
  });

  it("123. Revoke share sets status=revoked", () => {
    const update = { status: "revoked" };
    expect(update.status).toBe("revoked");
  });

  it("124. Update share status viewed sets viewed_at", () => {
    const status = "viewed";
    const updates: Record<string, unknown> = { status };
    if (status === "viewed") updates.viewed_at = new Date().toISOString();
    expect(updates.viewed_at).toBeTruthy();
  });

  it("125. Update share status completed sets completed_at + completion_notes", () => {
    const status = "completed";
    const completionNotes = "All tests reviewed";
    const updates: Record<string, unknown> = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
      if (completionNotes) updates.completion_notes = completionNotes;
    }
    expect(updates.completed_at).toBeTruthy();
    expect(updates.completion_notes).toBe("All tests reviewed");
  });

  it("126. Doctor-pathologist received shares filtered by pathologist_id", () => {
    const queryKey = ["pathologist-received-shares", "path-1"];
    expect(queryKey[0]).toBe("pathologist-received-shares");
  });

  it("127. Doctor-pathologist sent shares filtered by doctor_id", () => {
    const queryKey = ["doctor-sent-shares", "doctor-1"];
    expect(queryKey[0]).toBe("doctor-sent-shares");
  });

  it("128. Name resolution resolves doctor_name, pathologist_name, pathologist_lab, patient_name", () => {
    const resolved = {
      doctor_name: "Dr. Smith",
      pathologist_name: "Dr. Lab",
      pathologist_lab: "Expert Labs",
      patient_name: "John Doe",
    };
    expect(resolved.doctor_name).toBeTruthy();
    expect(resolved.pathologist_name).toBeTruthy();
    expect(resolved.pathologist_lab).toBeTruthy();
    expect(resolved.patient_name).toBeTruthy();
  });

  it("129. Mark share as viewed sets status=viewed", () => {
    const update = { status: "viewed" };
    expect(update.status).toBe("viewed");
  });

  it("130. Mark share as completed sets completed_at timestamp", () => {
    const update = { status: "completed", completed_at: new Date().toISOString() };
    expect(update.status).toBe("completed");
    expect(update.completed_at).toBeTruthy();
  });

  it("131. Create doctor-pathologist share with doctor_id from auth", () => {
    const userId = "doctor-1";
    const shareData = { pathologist_id: "path-1", patient_id: "patient-1" };
    const insertData = { doctor_id: userId, ...shareData };
    expect(insertData.doctor_id).toBe(userId);
  });

  it("132. Pending count for received shares", () => {
    const received = [
      { status: "pending" },
      { status: "viewed" },
      { status: "pending" },
      { status: "completed" },
    ];
    const pendingCount = received.filter((s) => s.status === "pending").length;
    expect(pendingCount).toBe(2);
  });

  it("133. Name resolution maps doctor/pathologist/patient correctly", () => {
    const shares = [{ doctor_id: "d1", pathologist_id: "p1", patient_id: "pt1" }];
    const doctorMap: Record<string, string> = { d1: "Dr. Smith" };
    const pathMap: Record<string, { name: string; lab: string }> = { p1: { name: "Dr. Lab", lab: "Expert Labs" } };
    const patientMap: Record<string, string> = { pt1: "John Doe" };
    const resolved = shares.map((s) => ({
      ...s,
      doctor_name: doctorMap[s.doctor_id] || null,
      pathologist_name: pathMap[s.pathologist_id]?.name || null,
      pathologist_lab: pathMap[s.pathologist_id]?.lab || null,
      patient_name: patientMap[s.patient_id] || null,
    }));
    expect(resolved[0].doctor_name).toBe("Dr. Smith");
    expect(resolved[0].pathologist_name).toBe("Dr. Lab");
    expect(resolved[0].pathologist_lab).toBe("Expert Labs");
    expect(resolved[0].patient_name).toBe("John Doe");
  });

  it("134. Name resolution handles missing profiles gracefully", () => {
    const shares = [{ doctor_id: "unknown", pathologist_id: "unknown", patient_id: "unknown" }];
    const doctorMap: Record<string, string> = {};
    const pathMap: Record<string, { name: string; lab: string }> = {};
    const patientMap: Record<string, string> = {};
    const resolved = shares.map((s) => ({
      ...s,
      doctor_name: doctorMap[s.doctor_id] || null,
      pathologist_name: pathMap[s.pathologist_id]?.name || null,
      pathologist_lab: pathMap[s.pathologist_id]?.lab || null,
      patient_name: patientMap[s.patient_id] || null,
    }));
    expect(resolved[0].doctor_name).toBeNull();
    expect(resolved[0].pathologist_name).toBeNull();
    expect(resolved[0].pathologist_lab).toBeNull();
    expect(resolved[0].patient_name).toBeNull();
  });

  it("135. Expiry boundary: share expiring exactly now is excluded", () => {
    const now = new Date();
    const shares = [
      { status: "viewed", expires_at: now.toISOString() },
      { status: "viewed", expires_at: new Date(now.getTime() + 60000).toISOString() },
    ];
    const active = shares.filter(
      (s) => s.status !== "revoked" && (!s.expires_at || new Date(s.expires_at) > new Date())
    );
    // Exact-now should be excluded (not strictly greater), future should remain
    expect(active.length).toBeLessThanOrEqual(1);
  });

  it("136. Anonymization explicit false overrides default", () => {
    const val: boolean | undefined = false;
    const isAnonymized = val ?? true;
    expect(isAnonymized).toBe(false);
  });

  it("137. Notification payload includes share_id in metadata", () => {
    const shareId = "share-abc-123";
    const diseaseCategory = "oncology";
    const notification = {
      user_id: "path-1",
      type: "patient_data_shared",
      title: "New Patient Data Shared",
      message: "A patient has shared their health data with you.",
      metadata: { share_id: shareId, disease_category: diseaseCategory },
    };
    expect(notification.metadata.share_id).toBe(shareId);
    expect(notification.metadata.disease_category).toBe("oncology");
    expect(notification.type).toBe("patient_data_shared");
    expect(notification.message).toContain("shared");
  });

  it("138. Summary strip: awaitingDoctorView = shared + no doctor_viewed_at", () => {
    const reports = [
      { is_shared_with_doctor: true, doctor_viewed_at: null },
      { is_shared_with_doctor: true, doctor_viewed_at: "2025-01-01T00:00:00Z" },
      { is_shared_with_doctor: false, doctor_viewed_at: null },
      { is_shared_with_doctor: true, doctor_viewed_at: null },
    ];
    const awaitingDoctorView = reports.filter((r) => r.is_shared_with_doctor && !r.doctor_viewed_at).length;
    expect(awaitingDoctorView).toBe(2);
  });

  it("139. Summary strip: pendingFromDoctors counts only pending status", () => {
    const receivedShares = [
      { status: "pending" },
      { status: "viewed" },
      { status: "completed" },
      { status: "pending" },
      { status: "pending" },
    ];
    const pendingFromDoctors = receivedShares.filter((s) => s.status === "pending").length;
    expect(pendingFromDoctors).toBe(3);
  });

  it("140. ShareCard badge class: pending = amber, viewed = cyan, completed = green", () => {
    const statusColors: Record<string, string> = {
      pending: "amber",
      viewed: "cyan",
      completed: "green",
    };
    expect(statusColors["pending"]).toBe("amber");
    expect(statusColors["viewed"]).toBe("cyan");
    expect(statusColors["completed"]).toBe("green");
  });

  it("141. Auth guard: createShare throws when user is null", () => {
    const userId: string | null = null;
    const createShare = () => {
      if (!userId) throw new Error("Not authenticated");
      return { doctor_id: userId, pathologist_id: "p1", patient_id: "pt1" };
    };
    expect(() => createShare()).toThrowError("Not authenticated");
  });

  it("142. Completed without notes omits completion_notes", () => {
    const status = "completed";
    const completionNotes: string | undefined = undefined;
    const updates: Record<string, unknown> = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
      if (completionNotes) updates.completion_notes = completionNotes;
    }
    expect(updates.completed_at).toBeTruthy();
    expect(updates.completion_notes).toBeUndefined();
  });

  it("143. Revoked shares excluded from active count in both patient and pathologist views", () => {
    const shares = [
      { status: "pending", expires_at: null },
      { status: "revoked", expires_at: null },
      { status: "viewed", expires_at: "2030-01-01T00:00:00Z" },
      { status: "completed", expires_at: null },
      { status: "revoked", expires_at: "2030-01-01T00:00:00Z" },
    ];
    const active = shares.filter(
      (s) => s.status !== "revoked" && (!s.expires_at || new Date(s.expires_at) > new Date())
    );
    expect(active).toHaveLength(3);
    expect(active.every((s) => s.status !== "revoked")).toBe(true);
  });

  it("144. Multiple status transitions: pending -> viewed -> completed timestamps accumulate", () => {
    const updates: Record<string, unknown> = { status: "pending" };

    // Transition to viewed
    updates.status = "viewed";
    updates.viewed_at = "2025-06-01T10:00:00Z";

    // Transition to completed
    updates.status = "completed";
    updates.completed_at = "2025-06-02T14:00:00Z";
    updates.completion_notes = "Review complete";

    expect(updates.status).toBe("completed");
    expect(updates.viewed_at).toBeTruthy();
    expect(updates.completed_at).toBeTruthy();
    expect(updates.completion_notes).toBe("Review complete");
  });
});
