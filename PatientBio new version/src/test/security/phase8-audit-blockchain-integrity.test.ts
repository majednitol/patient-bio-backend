/**
 * Phase 8: Audit Trail & Blockchain Integrity
 * Validates hash chain linking, tamper detection, Merkle tree proofs, and integrity scoring.
 */
import { describe, it, expect } from "vitest";
import {
  computeAuditHash,
  buildAuditChain,
  verifyAuditChain,
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof,
  generateConsentSignature,
} from "./security-helpers";

const sampleEvents = [
  { event_type: "RECORD_CREATED", entity_type: "health_record", entity_id: "rec-1", user_id: "u-1", action: "created", details: { title: "Blood Test" } },
  { event_type: "ACCESS_GRANTED", entity_type: "access_token", entity_id: "tok-1", user_id: "u-1", action: "created", details: { label: "Dr. Smith" } },
  { event_type: "CONSENT_GIVEN", entity_type: "consent", entity_id: "con-1", user_id: "u-1", action: "granted", details: { type: "research" } },
];

describe("Phase 8: Audit Trail & Blockchain Integrity", () => {
  it("1. Hash chain: entry N previous_hash equals entry N-1 event_hash", () => {
    const chain = buildAuditChain(sampleEvents);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].previous_hash).toBe(chain[i - 1].event_hash);
    }
  });

  it("2. Genesis entry has correct genesis hash prefix", () => {
    const chain = buildAuditChain(sampleEvents);
    expect(chain[0].previous_hash).toContain("GENESIS");
  });

  it("3. Tampered entry (modified action) -- hash mismatch detected", () => {
    const chain = buildAuditChain(sampleEvents);
    // Tamper with entry 1's action
    chain[1].action = "TAMPERED";
    const result = verifyAuditChain(chain);
    expect(result.valid).toBe(false);
  });

  it("4. Tampered entry (modified details) -- chain broken", () => {
    const chain = buildAuditChain(sampleEvents);
    chain[1].details = { hacked: true };
    const result = verifyAuditChain(chain);
    expect(result.valid).toBe(false);
  });

  it("5. computeAuditHash produces deterministic output", () => {
    const h1 = computeAuditHash("CREATE", "record", "r1", "u1", "created", {}, "prev", "2024-01-01");
    const h2 = computeAuditHash("CREATE", "record", "r1", "u1", "created", {}, "prev", "2024-01-01");
    expect(h1).toBe(h2);
    // Different input -> different hash
    const h3 = computeAuditHash("CREATE", "record", "r1", "u1", "deleted", {}, "prev", "2024-01-01");
    expect(h3).not.toBe(h1);
  });

  it("6. 100 sequential entries -- chain is fully intact", () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      event_type: "EVENT",
      entity_type: "entity",
      entity_id: `e-${i}`,
      user_id: `u-${i % 10}`,
      action: "action",
      details: { index: i },
    }));
    const chain = buildAuditChain(events);
    const result = verifyAuditChain(chain);
    expect(result.valid).toBe(true);
    expect(result.integrityPct).toBe(100);
  });

  it("7. Blockchain transaction links to correct previous hash", () => {
    const chain = buildAuditChain(sampleEvents);
    expect(chain[0].previous_hash).toContain("GENESIS");
    expect(chain[1].previous_hash).toBe(chain[0].event_hash);
    expect(chain[2].previous_hash).toBe(chain[1].event_hash);
  });

  it("8. Consent signature matches generateConsentSignature output", () => {
    const sig = generateConsentSignature("p1", "data_sharing", "Treatment", ["health_records"], "2024-01-01T00:00:00Z");
    const sig2 = generateConsentSignature("p1", "data_sharing", "Treatment", ["health_records"], "2024-01-01T00:00:00Z");
    expect(sig).toBe(sig2);
  });

  it("9. Modified consent scope -- signature verification fails", () => {
    const sig1 = generateConsentSignature("p1", "research", "Study", ["health_records"], "2024-01-01T00:00:00Z");
    const sig2 = generateConsentSignature("p1", "research", "Study", ["health_records", "prescriptions"], "2024-01-01T00:00:00Z");
    expect(sig1).not.toBe(sig2);
  });

  it("10. Block number monotonically increases (simulated)", () => {
    const chain = buildAuditChain(sampleEvents);
    // Each entry has a monotonically increasing created_at
    for (let i = 1; i < chain.length; i++) {
      expect(new Date(chain[i].created_at).getTime()).toBeGreaterThan(new Date(chain[i - 1].created_at).getTime());
    }
  });

  it("11. Merkle root computation for 8 leaves -- correct root", () => {
    const leaves = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const { root, layers } = buildMerkleTree(leaves);
    expect(root).toBeTruthy();
    expect(layers.length).toBeGreaterThan(1);
    // Root layer has exactly 1 element
    expect(layers[layers.length - 1].length).toBe(1);
    expect(layers[layers.length - 1][0]).toBe(root);
  });

  it("12. Merkle proof for leaf 3 -- verifies against root", () => {
    const leaves = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const { root, layers } = buildMerkleTree(leaves);
    const proof = getMerkleProof(layers, 3);
    const leafHash = layers[0][3];
    expect(verifyMerkleProof(leafHash, proof, root, 3)).toBe(true);
  });

  it("13. Missing leaf in Merkle tree -- proof fails", () => {
    const leaves = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const { root, layers } = buildMerkleTree(leaves);
    const proof = getMerkleProof(layers, 3);
    // Use wrong leaf hash
    expect(verifyMerkleProof("wrong_hash", proof, root, 3)).toBe(false);
  });

  it("14. Integrity report: 100 valid + 1 tampered -- <100% integrity", () => {
    const events = Array.from({ length: 101 }, (_, i) => ({
      event_type: "EVENT",
      entity_type: "entity",
      entity_id: `e-${i}`,
      user_id: "u-1",
      action: "action",
      details: { i },
    }));
    const chain = buildAuditChain(events);
    // Tamper with entry 50
    chain[50].event_hash = "tampered_hash";
    const result = verifyAuditChain(chain);
    expect(result.valid).toBe(false);
    expect(result.integrityPct).toBeLessThan(100);
    expect(result.brokenAt).toBeLessThanOrEqual(51);
  });

  it("15. Full audit pipeline: create -> hash -> chain -> verify -> pass", () => {
    const events = [
      { event_type: "RECORD_CREATED", entity_type: "health_record", entity_id: "r1", user_id: "u1", action: "created", details: { title: "MRI Scan" } },
      { event_type: "ACCESS_GRANTED", entity_type: "token", entity_id: "t1", user_id: "u1", action: "granted", details: { label: "Lab" } },
      { event_type: "CONSENT_GIVEN", entity_type: "consent", entity_id: "c1", user_id: "u1", action: "granted", details: { type: "emergency" } },
      { event_type: "RECORD_UPDATED", entity_type: "health_record", entity_id: "r1", user_id: "u1", action: "updated", details: { title: "MRI Scan v2" } },
      { event_type: "ACCESS_REVOKED", entity_type: "token", entity_id: "t1", user_id: "u1", action: "revoked", details: {} },
    ];
    const chain = buildAuditChain(events);
    expect(chain.length).toBe(5);
    const result = verifyAuditChain(chain);
    expect(result.valid).toBe(true);
    expect(result.integrityPct).toBe(100);
    expect(result.brokenAt).toBeNull();
  });
});
