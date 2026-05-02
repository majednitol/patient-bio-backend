import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple string similarity using Levenshtein-based approach
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1.0;

  const longer = al.length > bl.length ? al : bl;
  const shorter = al.length > bl.length ? bl : al;
  if (longer.length === 0) return 1.0;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer[i - 1] !== shorter[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }

  return (longer.length - costs[shorter.length]) / longer.length;
}

function normalizePhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { hospital_id, patient_id } = await req.json();

    if (!hospital_id) {
      return new Response(JSON.stringify({ error: "hospital_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all hospital-connected patient IDs
    const { data: admissionPatients } = await supabase
      .from("admissions")
      .select("patient_id")
      .eq("hospital_id", hospital_id);

    const { data: appointmentPatients } = await supabase
      .from("appointments")
      .select("patient_id")
      .eq("hospital_id", hospital_id);

    const patientIds = new Set<string>();
    admissionPatients?.forEach((a) => patientIds.add(a.patient_id));
    appointmentPatients?.forEach((a) => patientIds.add(a.patient_id));

    if (patientIds.size === 0) {
      return new Response(JSON.stringify({ candidates: [], scanned: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all profiles at once (batch)
    const allPatientIds = Array.from(patientIds);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, date_of_birth, phone, patient_passport_id")
      .in("user_id", allPatientIds);

    if (!profiles || profiles.length < 2) {
      return new Response(JSON.stringify({ candidates: [], scanned: profiles?.length || 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-filter: group by DOB and phone for quick candidate identification
    const dobGroups = new Map<string, typeof profiles>();
    const phoneGroups = new Map<string, typeof profiles>();

    for (const p of profiles) {
      if (p.date_of_birth) {
        const group = dobGroups.get(p.date_of_birth) || [];
        group.push(p);
        dobGroups.set(p.date_of_birth, group);
      }
      const phone = normalizePhone(p.phone);
      if (phone) {
        const group = phoneGroups.get(phone) || [];
        group.push(p);
        phoneGroups.set(phone, group);
      }
    }

    // Build candidate pairs from pre-filtered groups (much faster than O(n^2))
    const pairsToCheck = new Set<string>();
    const addPair = (idA: string, idB: string) => {
      const key = [idA, idB].sort().join("|");
      pairsToCheck.add(key);
    };

    // Pairs from same DOB
    for (const group of dobGroups.values()) {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            addPair(group[i].user_id, group[j].user_id);
          }
        }
      }
    }

    // Pairs from same phone
    for (const group of phoneGroups.values()) {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            addPair(group[i].user_id, group[j].user_id);
          }
        }
      }
    }

    // If a specific patient_id was provided, also check name similarity against all others
    if (patient_id) {
      const target = profiles.find((p) => p.user_id === patient_id);
      if (target) {
        for (const other of profiles) {
          if (other.user_id === target.user_id) continue;
          if (target.display_name && other.display_name) {
            const nameSim = similarity(target.display_name, other.display_name);
            if (nameSim >= 0.7) {
              addPair(target.user_id, other.user_id);
            }
          }
        }
      }
    }

    // Now score only the pre-filtered pairs
    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const candidates: any[] = [];

    // Batch fetch existing candidates to avoid individual queries
    const { data: existingCandidates } = await supabase
      .from("patient_merge_candidates")
      .select("patient_id_a, patient_id_b")
      .eq("hospital_id", hospital_id);

    const existingPairs = new Set(
      (existingCandidates || []).map((c) =>
        [c.patient_id_a, c.patient_id_b].sort().join("|")
      )
    );

    const insertBatch: any[] = [];

    for (const pairKey of pairsToCheck) {
      if (existingPairs.has(pairKey)) continue;

      const [idA, idB] = pairKey.split("|");
      const a = profileMap.get(idA);
      const b = profileMap.get(idB);
      if (!a || !b) continue;

      const matchFactors: Record<string, any> = {};
      let score = 0;
      let factorCount = 0;

      // Name similarity (weight: 0.4)
      if (a.display_name && b.display_name) {
        const nameSim = similarity(a.display_name, b.display_name);
        matchFactors.name_similarity = Math.round(nameSim * 100) / 100;
        score += nameSim * 0.4;
        factorCount++;
      }

      // DOB exact match (weight: 0.35)
      if (a.date_of_birth && b.date_of_birth) {
        const dobMatch = a.date_of_birth === b.date_of_birth;
        matchFactors.dob_match = dobMatch;
        score += dobMatch ? 0.35 : 0;
        factorCount++;
      }

      // Phone match (weight: 0.25)
      const phoneA = normalizePhone(a.phone);
      const phoneB = normalizePhone(b.phone);
      if (phoneA && phoneB) {
        const phoneMatch = phoneA === phoneB;
        matchFactors.phone_match = phoneMatch;
        score += phoneMatch ? 0.25 : 0;
        factorCount++;
      }

      if (score >= 0.5 && factorCount >= 2) {
        matchFactors.confidence_score = Math.round(score * 100) / 100;

        insertBatch.push({
          patient_id_a: idA,
          patient_id_b: idB,
          confidence_score: score,
          match_factors: matchFactors,
          hospital_id,
          status: "pending",
        });

        candidates.push({
          patient_a: { id: idA, name: a.display_name },
          patient_b: { id: idB, name: b.display_name },
          confidence_score: Math.round(score * 100) / 100,
          match_factors: matchFactors,
        });
      }
    }

    // Batch insert all candidates at once
    if (insertBatch.length > 0) {
      await supabase.from("patient_merge_candidates").insert(insertBatch);
    }

    return new Response(
      JSON.stringify({
        candidates,
        scanned: profiles.length,
        pairsChecked: pairsToCheck.size,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in detect-duplicate-patients:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
