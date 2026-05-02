import { describe, it, expect } from "vitest";
import {
  sanitizeInput,
  encodeForURL,
  validateFileName,
  safeJSONParse,
  neutralizeSQLInjection,
} from "./security-helpers";

describe("Phase 4: Input Sanitization", () => {
  it("1. Script tags stripped from display_name", () => {
    const result = sanitizeInput('John<script>alert("xss")</script>Doe');
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script>");
  });

  it("2. HTML entities escaped in profile fields", () => {
    const result = sanitizeInput('<b>Bold</b> & "quoted"');
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&amp;");
    expect(result).toContain("&quot;");
  });

  it("3. SQL injection attempt in search query neutralized", () => {
    const result = neutralizeSQLInjection("'; DROP TABLE users; --");
    expect(result).not.toContain("DROP");
    expect(result).not.toContain("--");
    expect(result).not.toContain("'");
  });

  it("4. URL parameters properly encoded for WhatsApp share", () => {
    const message = "Check my health report & data <here>";
    const encoded = encodeForURL(message);
    const url = `https://wa.me/?text=${encoded}`;
    expect(url).not.toContain("&");
    expect(url).not.toContain("<");
    expect(encoded).toBe(encodeURIComponent(message));
  });

  it("5. URL parameters properly encoded for email share", () => {
    const subject = "Report: Patient's Data & Results";
    const encoded = encodeForURL(subject);
    const mailto = `mailto:?subject=${encoded}`;
    expect(encoded).toBe(encodeURIComponent(subject));
    expect(mailto).not.toContain("& ");
  });

  it("6. URL parameters properly encoded for SMS share", () => {
    const body = "View report at https://example.com?id=123&token=abc";
    const encoded = encodeForURL(body);
    const sms = `sms:?body=${encoded}`;
    expect(encoded).toBe(encodeURIComponent(body));
    expect(sms).not.toContain("&token");
  });

  it("7. Oversized input (>10KB) rejected or truncated", () => {
    const longInput = "A".repeat(15000);
    const result = sanitizeInput(longInput);
    expect(result.length).toBeLessThanOrEqual(10240);
  });

  it("8. Null bytes stripped from input strings", () => {
    const result = sanitizeInput("hello\0world\0test");
    expect(result).not.toContain("\0");
  });

  it("9. Unicode control characters removed", () => {
    const result = sanitizeInput("hello\u200Bworld\u2028test\uFEFFfoo");
    expect(result).not.toContain("\u200B");
    expect(result).not.toContain("\u2028");
    expect(result).not.toContain("\uFEFF");
  });

  it("10. Nested script tags (double encoding) caught", () => {
    const result = sanitizeInput('<scr<script>ipt>alert("x")</scr</script>ipt>');
    expect(result).not.toContain("<script");
  });

  it("11. Event handler attributes (onerror, onload) stripped", () => {
    const result = sanitizeInput('<img onerror="alert(1)" onload="steal()" src="x">');
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("onload");
  });

  it("12. JSON injection in metadata fields prevented", () => {
    const malicious = '{"name": "test", "__proto__": {"admin": true}}';
    const parsed = safeJSONParse(malicious);
    expect(parsed.success).toBe(true);
    // Verify __proto__ pollution doesn't affect global
    const obj: Record<string, any> = {};
    expect(obj.admin).toBeUndefined();
  });

  it("13. Path traversal (../../etc/passwd) in file names blocked", () => {
    expect(validateFileName("../../etc/passwd").valid).toBe(false);
    expect(validateFileName("../secret.txt").valid).toBe(false);
    expect(validateFileName("normal-file.pdf").valid).toBe(true);
  });

  it("14. CRLF injection in header-like fields blocked", () => {
    const result = sanitizeInput("Normal Header\r\nX-Injected: malicious");
    expect(result).not.toContain("\r\n");
    expect(result).not.toContain("\r");
    expect(result).not.toContain("\n");
  });

  it("15. Empty string and whitespace-only inputs rejected", () => {
    expect(() => sanitizeInput("")).toThrow();
    expect(() => sanitizeInput("   ")).toThrow();
    expect(() => sanitizeInput("\t\n")).toThrow();
  });
});
