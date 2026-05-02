import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Escape XML special characters
function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Format date to CDA format (YYYYMMDD or YYYYMMDDHHmmss)
function formatCDADate(dateStr: string | null | undefined, includeTime = false): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hours}${mins}${secs}`;
  }
  return `${year}${month}${day}`;
}

// Generate unique ID for CDA elements
function generateCDAId(): string {
  return `2.16.840.1.113883.4.6.${Date.now()}.${Math.floor(Math.random() * 100000)}`;
}

// Map gender to CDA code
function mapGender(gender: string | null): { code: string; display: string } {
  const genderMap: Record<string, { code: string; display: string }> = {
    male: { code: "M", display: "Male" },
    female: { code: "F", display: "Female" },
    other: { code: "UN", display: "Undifferentiated" },
  };
  return genderMap[gender?.toLowerCase() || ""] || { code: "UN", display: "Unknown" };
}

// Generate CDA header
function generateCDAHeader(profile: any, healthData: any, docId: string): string {
  const now = new Date().toISOString();
  const genderInfo = mapGender(profile.gender);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="CDA.xsl"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:sdtc="urn:hl7-org:sdtc">
  <realmCode code="US"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1" extension="2015-08-01"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.2" extension="2015-08-01"/>
  <id root="${docId}"/>
  <code code="34133-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="Summarization of Episode Note"/>
  <title>Continuity of Care Document (C-CDA)</title>
  <effectiveTime value="${formatCDADate(now, true)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.4.1" extension="${escapeXml(profile.patient_passport_id || profile.user_id)}"/>
      <addr use="HP">
        ${profile.address ? `<streetAddressLine>${escapeXml(profile.address)}</streetAddressLine>` : ""}
        ${profile.city ? `<city>${escapeXml(profile.city)}</city>` : ""}
        ${profile.country ? `<country>${escapeXml(profile.country)}</country>` : ""}
      </addr>
      ${profile.phone ? `<telecom value="tel:${escapeXml(profile.phone)}" use="HP"/>` : ""}
      ${profile.email ? `<telecom value="mailto:${escapeXml(profile.email)}"/>` : ""}
      <patient>
        <name>
          <given>${escapeXml(profile.display_name?.split(" ")[0] || "")}</given>
          <family>${escapeXml(profile.display_name?.split(" ").slice(1).join(" ") || "")}</family>
        </name>
        <administrativeGenderCode code="${genderInfo.code}" codeSystem="2.16.840.1.113883.5.1" displayName="${genderInfo.display}"/>
        ${profile.date_of_birth ? `<birthTime value="${formatCDADate(profile.date_of_birth)}"/>` : ""}
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="${formatCDADate(now, true)}"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.4.6" extension="PatientBio"/>
      <assignedAuthoringDevice>
        <softwareName>PatientBio Health Platform</softwareName>
      </assignedAuthoringDevice>
    </assignedAuthor>
  </author>
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="2.16.840.1.113883.4.6"/>
        <name>PatientBio</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>
  <documentationOf>
    <serviceEvent classCode="PCPR">
      <effectiveTime>
        <low value="${formatCDADate(profile.created_at)}"/>
        <high value="${formatCDADate(now)}"/>
      </effectiveTime>
    </serviceEvent>
  </documentationOf>`;
}

// Generate Allergies Section
function generateAllergiesSection(userId: string, allergies: string | null): string {
  const allergyList = allergies
    ?.split(/[,;\n]/)
    .map((a) => a.trim())
    .filter(Boolean) || [];

  if (allergyList.length === 0) {
    return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.6.1" extension="2015-08-01"/>
      <code code="48765-2" codeSystem="2.16.840.1.113883.6.1" displayName="Allergies"/>
      <title>Allergies and Adverse Reactions</title>
      <text>No known allergies</text>
    </section>
  </component>`;
  }

  const allergyEntries = allergyList.map((allergy, index) => `
        <entry typeCode="DRIV">
          <act classCode="ACT" moodCode="EVN">
            <templateId root="2.16.840.1.113883.10.20.22.4.30" extension="2015-08-01"/>
            <id root="${generateCDAId()}"/>
            <code code="CONC" codeSystem="2.16.840.1.113883.5.6"/>
            <statusCode code="active"/>
            <effectiveTime><low nullFlavor="UNK"/></effectiveTime>
            <entryRelationship typeCode="SUBJ">
              <observation classCode="OBS" moodCode="EVN">
                <templateId root="2.16.840.1.113883.10.20.22.4.7" extension="2014-06-09"/>
                <id root="${generateCDAId()}"/>
                <code code="ASSERTION" codeSystem="2.16.840.1.113883.5.4"/>
                <statusCode code="completed"/>
                <effectiveTime><low nullFlavor="UNK"/></effectiveTime>
                <value xsi:type="CD" code="419199007" codeSystem="2.16.840.1.113883.6.96" displayName="Allergy to substance">
                  <originalText>${escapeXml(allergy)}</originalText>
                </value>
                <participant typeCode="CSM">
                  <participantRole classCode="MANU">
                    <playingEntity classCode="MMAT">
                      <code nullFlavor="UNK">
                        <originalText>${escapeXml(allergy)}</originalText>
                      </code>
                    </playingEntity>
                  </participantRole>
                </participant>
              </observation>
            </entryRelationship>
          </act>
        </entry>`).join("");

  return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.6.1" extension="2015-08-01"/>
      <code code="48765-2" codeSystem="2.16.840.1.113883.6.1" displayName="Allergies"/>
      <title>Allergies and Adverse Reactions</title>
      <text>
        <list>
          ${allergyList.map((a) => `<item>${escapeXml(a)}</item>`).join("\n          ")}
        </list>
      </text>
      ${allergyEntries}
    </section>
  </component>`;
}

// Generate Medications Section
function generateMedicationsSection(userId: string, medications: string | null): string {
  const medList = medications
    ?.split(/[,;\n]/)
    .map((m) => m.trim())
    .filter(Boolean) || [];

  if (medList.length === 0) {
    return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.1.1" extension="2014-06-09"/>
      <code code="10160-0" codeSystem="2.16.840.1.113883.6.1" displayName="Medications"/>
      <title>Medications</title>
      <text>No current medications</text>
    </section>
  </component>`;
  }

  const medEntries = medList.map((med) => `
        <entry typeCode="DRIV">
          <substanceAdministration classCode="SBADM" moodCode="EVN">
            <templateId root="2.16.840.1.113883.10.20.22.4.16" extension="2014-06-09"/>
            <id root="${generateCDAId()}"/>
            <statusCode code="active"/>
            <effectiveTime xsi:type="IVL_TS"><low nullFlavor="UNK"/></effectiveTime>
            <consumable>
              <manufacturedProduct classCode="MANU">
                <templateId root="2.16.840.1.113883.10.20.22.4.23" extension="2014-06-09"/>
                <manufacturedMaterial>
                  <code nullFlavor="UNK">
                    <originalText>${escapeXml(med)}</originalText>
                  </code>
                </manufacturedMaterial>
              </manufacturedProduct>
            </consumable>
          </substanceAdministration>
        </entry>`).join("");

  return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.1.1" extension="2014-06-09"/>
      <code code="10160-0" codeSystem="2.16.840.1.113883.6.1" displayName="Medications"/>
      <title>Medications</title>
      <text>
        <list>
          ${medList.map((m) => `<item>${escapeXml(m)}</item>`).join("\n          ")}
        </list>
      </text>
      ${medEntries}
    </section>
  </component>`;
}

// Generate Problems (Conditions) Section
function generateProblemsSection(userId: string, chronicDiseases: string | null, previousDiseases: string | null): string {
  const chronicList = chronicDiseases
    ?.split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean) || [];
  const previousList = previousDiseases
    ?.split(/[,;\n]/)
    .map((p) => p.trim())
    .filter(Boolean) || [];

  const allConditions = [
    ...chronicList.map((c) => ({ name: c, status: "active" })),
    ...previousList.map((p) => ({ name: p, status: "resolved" })),
  ];

  if (allConditions.length === 0) {
    return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.5.1" extension="2015-08-01"/>
      <code code="11450-4" codeSystem="2.16.840.1.113883.6.1" displayName="Problem List"/>
      <title>Problems</title>
      <text>No known problems</text>
    </section>
  </component>`;
  }

  const problemEntries = allConditions.map((cond) => `
        <entry typeCode="DRIV">
          <act classCode="ACT" moodCode="EVN">
            <templateId root="2.16.840.1.113883.10.20.22.4.3" extension="2015-08-01"/>
            <id root="${generateCDAId()}"/>
            <code code="CONC" codeSystem="2.16.840.1.113883.5.6"/>
            <statusCode code="${cond.status}"/>
            <effectiveTime><low nullFlavor="UNK"/></effectiveTime>
            <entryRelationship typeCode="SUBJ">
              <observation classCode="OBS" moodCode="EVN">
                <templateId root="2.16.840.1.113883.10.20.22.4.4" extension="2015-08-01"/>
                <id root="${generateCDAId()}"/>
                <code code="64572001" codeSystem="2.16.840.1.113883.6.96" displayName="Condition"/>
                <statusCode code="completed"/>
                <effectiveTime><low nullFlavor="UNK"/></effectiveTime>
                <value xsi:type="CD" nullFlavor="UNK">
                  <originalText>${escapeXml(cond.name)}</originalText>
                </value>
              </observation>
            </entryRelationship>
          </act>
        </entry>`).join("");

  return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.5.1" extension="2015-08-01"/>
      <code code="11450-4" codeSystem="2.16.840.1.113883.6.1" displayName="Problem List"/>
      <title>Problems</title>
      <text>
        <list>
          ${chronicList.length > 0 ? `<item>Active Conditions: ${chronicList.map((c) => escapeXml(c)).join(", ")}</item>` : ""}
          ${previousList.length > 0 ? `<item>Resolved Conditions: ${previousList.map((p) => escapeXml(p)).join(", ")}</item>` : ""}
        </list>
      </text>
      ${problemEntries}
    </section>
  </component>`;
}

// Generate Vital Signs Section
function generateVitalSignsSection(userId: string, metrics: any[]): string {
  if (!metrics || metrics.length === 0) {
    return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.4.1" extension="2015-08-01"/>
      <code code="8716-3" codeSystem="2.16.840.1.113883.6.1" displayName="Vital Signs"/>
      <title>Vital Signs</title>
      <text>No vital signs recorded</text>
    </section>
  </component>`;
  }

  const loincCodes: Record<string, { code: string; display: string; unit: string }> = {
    weight: { code: "29463-7", display: "Body weight", unit: "kg" },
    height: { code: "8302-2", display: "Body height", unit: "cm" },
    blood_pressure_systolic: { code: "8480-6", display: "Systolic blood pressure", unit: "mm[Hg]" },
    blood_pressure_diastolic: { code: "8462-4", display: "Diastolic blood pressure", unit: "mm[Hg]" },
    heart_rate: { code: "8867-4", display: "Heart rate", unit: "/min" },
    temperature: { code: "8310-5", display: "Body temperature", unit: "Cel" },
    blood_glucose: { code: "2339-0", display: "Glucose", unit: "mg/dL" },
    oxygen_saturation: { code: "2708-6", display: "Oxygen saturation", unit: "%" },
  };

  const vitalEntries = metrics
    .filter((m) => loincCodes[m.metric_type])
    .slice(0, 20) // Limit to last 20 readings
    .map((metric) => {
      const coding = loincCodes[metric.metric_type];
      return `
        <entry typeCode="DRIV">
          <organizer classCode="CLUSTER" moodCode="EVN">
            <templateId root="2.16.840.1.113883.10.20.22.4.26" extension="2015-08-01"/>
            <id root="${generateCDAId()}"/>
            <code code="46680005" codeSystem="2.16.840.1.113883.6.96" displayName="Vital signs"/>
            <statusCode code="completed"/>
            <effectiveTime value="${formatCDADate(metric.measured_at || metric.created_at, true)}"/>
            <component>
              <observation classCode="OBS" moodCode="EVN">
                <templateId root="2.16.840.1.113883.10.20.22.4.27" extension="2014-06-09"/>
                <id root="${generateCDAId()}"/>
                <code code="${coding.code}" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="${escapeXml(coding.display)}"/>
                <statusCode code="completed"/>
                <effectiveTime value="${formatCDADate(metric.measured_at || metric.created_at, true)}"/>
                <value xsi:type="PQ" value="${metric.value}" unit="${coding.unit}"/>
              </observation>
            </component>
          </organizer>
        </entry>`;
    }).join("");

  return `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.4.1" extension="2015-08-01"/>
      <code code="8716-3" codeSystem="2.16.840.1.113883.6.1" displayName="Vital Signs"/>
      <title>Vital Signs</title>
      <text>
        <table>
          <thead><tr><th>Vital Sign</th><th>Value</th><th>Date</th></tr></thead>
          <tbody>
            ${metrics.filter((m) => loincCodes[m.metric_type]).slice(0, 20).map((m) => {
              const coding = loincCodes[m.metric_type];
              return `<tr><td>${escapeXml(coding?.display || m.metric_type)}</td><td>${m.value} ${m.unit || coding?.unit || ""}</td><td>${new Date(m.measured_at || m.created_at).toLocaleDateString()}</td></tr>`;
            }).join("\n            ")}
          </tbody>
        </table>
      </text>
      ${vitalEntries}
    </section>
  </component>`;
}

// Generate complete C-CDA document
function generateCCDA(profile: any, healthData: any, metrics: any[]): string {
  const docId = generateCDAId();
  
  const header = generateCDAHeader(profile, healthData, docId);
  const allergiesSection = generateAllergiesSection(profile.user_id, healthData?.health_allergies);
  const medicationsSection = generateMedicationsSection(profile.user_id, healthData?.current_medications);
  const problemsSection = generateProblemsSection(profile.user_id, healthData?.chronic_diseases, healthData?.previous_diseases);
  const vitalsSection = generateVitalSignsSection(profile.user_id, metrics);

  return `${header}
  <component>
    <structuredBody>
      ${allergiesSection}
      ${medicationsSection}
      ${problemsSection}
      ${vitalsSection}
    </structuredBody>
  </component>
</ClinicalDocument>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating C-CDA export for user: ${user.id}`);

    // Fetch all patient data in parallel
    const [profileResult, healthDataResult, metricsResult] = await Promise.all([
      supabase.from("user_profiles").select("user_id, display_name, date_of_birth, gender, phone, address, city, country, patient_passport_id, created_at").eq("user_id", user.id).single(),
      supabase.from("health_data").select("user_id, health_allergies, current_medications, chronic_diseases, previous_diseases").eq("user_id", user.id).single(),
      supabase.from("health_metrics").select("id, user_id, metric_type, value, unit, measured_at, created_at").eq("user_id", user.id).order("measured_at", { ascending: false }).limit(100),
    ]);

    const profile = profileResult.data || { user_id: user.id, display_name: user.email };
    const healthData = healthDataResult.data || {};
    const metrics = metricsResult.data || [];

    console.log(`Found profile for ${profile.display_name}, generating C-CDA...`);

    // Generate C-CDA document
    const ccdaXml = generateCCDA(profile, healthData, metrics);

    console.log(`C-CDA generated successfully, size: ${ccdaXml.length} bytes`);

    return new Response(ccdaXml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="patient-ccda-${formatCDADate(new Date().toISOString())}.xml"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error generating C-CDA:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate C-CDA" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
