import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  getCorrelationId, 
  createLogger,
  withCorrelationHeaders 
} from '../_shared/correlationId.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MedicationInput {
  name: string;
  dosage?: string;
  frequency?: string;
}

interface InteractionResult {
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'contraindicated';
  medication1: string;
  medication2: string;
  description: string;
  recommendation: string;
  alternatives?: string[];
}

interface AllergyWarning {
  medication: string;
  allergy: string;
  severity: 'moderate' | 'severe' | 'contraindicated';
  description: string;
  alternatives: string[];
}

interface ConditionWarning {
  medication: string;
  condition: string;
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  description: string;
  recommendation: string;
  alternatives: string[];
}

interface AnalysisResult {
  interactions: InteractionResult[];
  allergyWarnings: AllergyWarning[];
  conditionWarnings: ConditionWarning[];
  generalWarnings: string[];
  overallRisk: 'low' | 'moderate' | 'high';
  disclaimer: string;
}

interface RequestBody {
  medications: MedicationInput[];
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string;
}

// Known allergy cross-reactions
const ALLERGY_CROSSREACTIONS: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'ampicillin', 'augmentin', 'co-amoxiclav', 'flucloxacillin', 'piperacillin', 'dicloxacillin'],
  sulfa: ['sulfamethoxazole', 'trimethoprim', 'co-trimoxazole', 'sulfasalazine'],
  nsaid: ['ibuprofen', 'naproxen', 'diclofenac', 'aspirin', 'piroxicam', 'meloxicam', 'indomethacin'],
  aspirin: ['ibuprofen', 'naproxen', 'diclofenac', 'piroxicam', 'meloxicam'],
  cephalosporin: ['cephalexin', 'cefuroxime', 'ceftriaxone', 'cefixime', 'cefpodoxime', 'ceftazidime', 'cefotaxime'],
  codeine: ['morphine', 'tramadol', 'oxycodone', 'hydrocodone', 'fentanyl'],
  statin: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'lovastatin'],
};

// Condition-drug contraindications
const CONDITION_CONTRAINDICATIONS: { condition: string; drugs: string[]; severity: 'mild' | 'moderate' | 'severe' | 'contraindicated'; desc: string; alts: string[] }[] = [
  { condition: 'asthma', drugs: ['propranolol', 'atenolol', 'metoprolol', 'carvedilol', 'timolol'], severity: 'severe', desc: 'Beta-blockers can trigger bronchospasm in asthma', alts: ['amlodipine', 'verapamil'] },
  { condition: 'asthma', drugs: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'], severity: 'moderate', desc: 'NSAIDs may worsen asthma (aspirin-exacerbated)', alts: ['paracetamol', 'acetaminophen'] },
  { condition: 'diabetes', drugs: ['prednisolone', 'prednisone', 'dexamethasone', 'hydrocortisone'], severity: 'moderate', desc: 'Corticosteroids raise blood glucose significantly', alts: [] },
  { condition: 'diabetes', drugs: ['thiazide', 'hydrochlorothiazide', 'chlorthalidone'], severity: 'mild', desc: 'Thiazide diuretics can impair glucose tolerance', alts: ['indapamide'] },
  { condition: 'hypertension', drugs: ['ibuprofen', 'naproxen', 'diclofenac', 'piroxicam'], severity: 'moderate', desc: 'NSAIDs can elevate blood pressure and reduce antihypertensive efficacy', alts: ['paracetamol', 'acetaminophen'] },
  { condition: 'hypertension', drugs: ['pseudoephedrine', 'phenylephrine'], severity: 'severe', desc: 'Decongestants cause significant BP elevation', alts: ['nasal saline', 'intranasal corticosteroids'] },
  { condition: 'kidney', drugs: ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac'], severity: 'severe', desc: 'NSAIDs reduce renal blood flow — nephrotoxic risk', alts: ['paracetamol'] },
  { condition: 'kidney', drugs: ['metformin'], severity: 'severe', desc: 'Metformin contraindicated in severe renal impairment (lactic acidosis)', alts: ['linagliptin', 'insulin'] },
  { condition: 'liver', drugs: ['paracetamol', 'acetaminophen'], severity: 'moderate', desc: 'Hepatotoxic at standard doses in liver disease', alts: [] },
  { condition: 'liver', drugs: ['methotrexate'], severity: 'severe', desc: 'Methotrexate is hepatotoxic — avoid in liver disease', alts: [] },
  { condition: 'heart failure', drugs: ['verapamil', 'diltiazem'], severity: 'severe', desc: 'Non-dihydropyridine CCBs worsen heart failure', alts: ['amlodipine'] },
  { condition: 'heart failure', drugs: ['ibuprofen', 'naproxen', 'diclofenac'], severity: 'severe', desc: 'NSAIDs cause fluid retention — worsen heart failure', alts: ['paracetamol'] },
  { condition: 'arthritis', drugs: ['allopurinol'], severity: 'mild', desc: 'May trigger acute gout flare at initiation', alts: [] },
  { condition: 'cancer', drugs: ['methotrexate', 'cyclophosphamide'], severity: 'moderate', desc: 'Immunosuppressants require close monitoring in cancer', alts: [] },
  { condition: 'peptic ulcer', drugs: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'], severity: 'severe', desc: 'NSAIDs cause GI bleeding in ulcer patients', alts: ['paracetamol', 'celecoxib with PPI'] },
];

function getFallbackAnalysis(body: RequestBody): AnalysisResult {
  const { medications, allergies = [], chronicConditions = [] } = body;
  const interactions: InteractionResult[] = [];
  const allergyWarnings: AllergyWarning[] = [];
  const conditionWarnings: ConditionWarning[] = [];
  const generalWarnings: string[] = [];
  
  const medNames = medications.map(m => m.name.toLowerCase());
  
  // Drug-drug interactions
  const knownInteractions: { drugs: string[]; severity: InteractionResult['severity']; desc: string; rec: string; alts: string[] }[] = [
    { drugs: ['warfarin', 'aspirin'], severity: 'severe', desc: 'Significantly increased bleeding risk', rec: 'Avoid combination or monitor INR closely', alts: ['paracetamol for pain'] },
    { drugs: ['warfarin', 'ibuprofen'], severity: 'severe', desc: 'Major bleeding risk — both affect hemostasis', rec: 'Avoid NSAIDs with warfarin', alts: ['paracetamol'] },
    { drugs: ['metformin', 'contrast dye'], severity: 'moderate', desc: 'Increased lactic acidosis risk', rec: 'Hold metformin 48h before/after contrast', alts: [] },
    { drugs: ['ssri', 'maoi'], severity: 'contraindicated', desc: 'Fatal serotonin syndrome risk', rec: 'Never combine — 2 week washout required', alts: [] },
    { drugs: ['ssri', 'tramadol'], severity: 'severe', desc: 'Serotonin syndrome risk', rec: 'Use alternative analgesic', alts: ['paracetamol', 'ibuprofen'] },
    { drugs: ['ace inhibitor', 'potassium'], severity: 'moderate', desc: 'Hyperkalemia risk', rec: 'Monitor serum potassium levels', alts: [] },
    { drugs: ['lisinopril', 'spironolactone'], severity: 'moderate', desc: 'Dual RAAS blockade — hyperkalemia risk', rec: 'Monitor potassium closely', alts: ['hydrochlorothiazide'] },
    { drugs: ['methotrexate', 'ibuprofen'], severity: 'severe', desc: 'Reduced methotrexate clearance — toxicity risk', rec: 'Avoid NSAIDs with methotrexate', alts: ['paracetamol'] },
    { drugs: ['methotrexate', 'trimethoprim'], severity: 'severe', desc: 'Additive folate antagonism — pancytopenia risk', rec: 'Avoid combination', alts: ['nitrofurantoin'] },
    { drugs: ['ciprofloxacin', 'theophylline'], severity: 'severe', desc: 'Ciprofloxacin inhibits theophylline metabolism — toxicity', rec: 'Use alternative antibiotic', alts: ['amoxicillin'] },
    { drugs: ['simvastatin', 'clarithromycin'], severity: 'severe', desc: 'Rhabdomyolysis risk — CYP3A4 inhibition', rec: 'Pause statin or use azithromycin', alts: ['azithromycin', 'pravastatin'] },
    { drugs: ['amlodipine', 'simvastatin'], severity: 'moderate', desc: 'Increased statin levels — myopathy risk', rec: 'Limit simvastatin to 20mg/day', alts: ['atorvastatin', 'rosuvastatin'] },
    { drugs: ['digoxin', 'amiodarone'], severity: 'severe', desc: 'Amiodarone raises digoxin levels 70-100%', rec: 'Halve digoxin dose when adding amiodarone', alts: [] },
    { drugs: ['clopidogrel', 'omeprazole'], severity: 'moderate', desc: 'Omeprazole reduces clopidogrel activation', rec: 'Use pantoprazole instead', alts: ['pantoprazole', 'famotidine'] },
    { drugs: ['lithium', 'ibuprofen'], severity: 'severe', desc: 'NSAIDs increase lithium levels — toxicity risk', rec: 'Avoid NSAIDs or monitor lithium levels', alts: ['paracetamol'] },
  ];
  
  for (const known of knownInteractions) {
    const match1 = medNames.find(m => known.drugs.some(d => m.includes(d)));
    const match2 = medNames.find(m => m !== match1 && known.drugs.some(d => m.includes(d)));
    
    if (match1 && match2) {
      interactions.push({
        severity: known.severity,
        medication1: medications.find(m => m.name.toLowerCase() === match1)?.name || match1,
        medication2: medications.find(m => m.name.toLowerCase() === match2)?.name || match2,
        description: known.desc,
        recommendation: known.rec,
        alternatives: known.alts,
      });
    }
  }
  
  // Allergy cross-checks
  for (const allergy of allergies) {
    const allergyLower = allergy.toLowerCase().trim();
    
    for (const med of medications) {
      const medLower = med.name.toLowerCase();
      
      // Direct match
      if (medLower.includes(allergyLower) || allergyLower.includes(medLower)) {
        allergyWarnings.push({
          medication: med.name,
          allergy,
          severity: 'contraindicated',
          description: `Patient is allergic to "${allergy}" — "${med.name}" is a direct match`,
          alternatives: [],
        });
        continue;
      }
      
      // Cross-reaction check
      for (const [allergyClass, relatedDrugs] of Object.entries(ALLERGY_CROSSREACTIONS)) {
        if (allergyLower.includes(allergyClass) || relatedDrugs.some(d => allergyLower.includes(d))) {
          if (relatedDrugs.some(d => medLower.includes(d)) || medLower.includes(allergyClass)) {
            allergyWarnings.push({
              medication: med.name,
              allergy,
              severity: 'severe',
              description: `Cross-reactivity: "${med.name}" belongs to the same class as "${allergy}"`,
              alternatives: allergyClass === 'penicillin' ? ['azithromycin', 'doxycycline'] :
                          allergyClass === 'nsaid' ? ['paracetamol', 'acetaminophen'] :
                          allergyClass === 'cephalosporin' ? ['azithromycin', 'doxycycline'] : [],
            });
          }
        }
      }
    }
  }
  
  // Chronic condition cross-checks
  for (const condition of chronicConditions) {
    const condLower = condition.toLowerCase().trim();
    
    for (const contra of CONDITION_CONTRAINDICATIONS) {
      if (!condLower.includes(contra.condition)) continue;
      
      for (const med of medications) {
        const medLower = med.name.toLowerCase();
        if (contra.drugs.some(d => medLower.includes(d))) {
          conditionWarnings.push({
            medication: med.name,
            condition,
            severity: contra.severity,
            description: contra.desc,
            recommendation: `Consider alternatives for patients with ${condition}`,
            alternatives: contra.alts,
          });
        }
      }
    }
  }
  
  // General warnings
  if (medications.length >= 5) {
    generalWarnings.push('Polypharmacy alert: 5+ medications. Schedule medication review.');
  }
  
  const hasPainMed = medNames.some(m => 
    ['ibuprofen', 'aspirin', 'naproxen', 'diclofenac'].some(d => m.includes(d))
  );
  if (hasPainMed) {
    generalWarnings.push('NSAIDs: prescribe with gastroprotection (PPI) if >65y or history of GI issues.');
  }
  
  // Determine overall risk
  let overallRisk: 'low' | 'moderate' | 'high' = 'low';
  const allSeverities = [
    ...interactions.map(i => i.severity),
    ...allergyWarnings.map(a => a.severity),
    ...conditionWarnings.map(c => c.severity),
  ];
  
  if (allSeverities.some(s => s === 'contraindicated' || s === 'severe')) {
    overallRisk = 'high';
  } else if (allSeverities.some(s => s === 'moderate') || allSeverities.length >= 2) {
    overallRisk = 'moderate';
  }
  
  return {
    interactions,
    allergyWarnings,
    conditionWarnings,
    generalWarnings,
    overallRisk,
    disclaimer: 'This AI-assisted analysis is for clinical decision support only. Always apply clinical judgment. Not a substitute for pharmacist review.',
  };
}

Deno.serve(async (req) => {
  const correlationId = getCorrelationId(req);
  const logger = createLogger(correlationId, 'check-medication-interactions');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: withCorrelationHeaders(corsHeaders, correlationId) });
  }

  try {
    logger.info('Processing smart medication interaction check');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { medications, allergies = [], chronicConditions = [], currentMedications } = body;

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No medications provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge current medications string into the list
    const allMedications = [...medications];
    if (currentMedications) {
      const parsed = currentMedications.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      parsed.forEach(name => allMedications.push({ name }));
    }

    logger.info('Smart interaction check', { 
      medCount: allMedications.length, 
      allergyCount: allergies.length, 
      conditionCount: chronicConditions.length 
    });

    // Build enhanced prompt
    const medicationList = allMedications
      .map(m => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`)
      .join(', ');

    const allergyList = allergies.length > 0 ? allergies.join(', ') : 'None';
    const conditionList = chronicConditions.length > 0 ? chronicConditions.join(', ') : 'None';

    const prompt = `You are a clinical pharmacology expert. Analyze these medications for a patient.

MEDICATIONS: ${medicationList}
ALLERGIES: ${allergyList}
CHRONIC CONDITIONS: ${conditionList}

Return JSON with:
{"interactions":[{"severity":"mild"|"moderate"|"severe"|"contraindicated","medication1":"","medication2":"","description":"<80chars","recommendation":"<120chars","alternatives":["alt drug names"]}],"allergyWarnings":[{"medication":"","allergy":"","severity":"moderate"|"severe"|"contraindicated","description":"<80chars","alternatives":["safe alternatives"]}],"conditionWarnings":[{"medication":"","condition":"","severity":"mild"|"moderate"|"severe"|"contraindicated","description":"<80chars","recommendation":"<120chars","alternatives":["safer options"]}],"generalWarnings":["string"],"overallRisk":"low"|"moderate"|"high"}

Rules: Only real documented interactions. Include cross-reactivity for allergies. Flag drugs contraindicated for the chronic conditions. Always suggest alternatives when flagging.`;

    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    let analysisResult: AnalysisResult;

    const fullBody: RequestBody = { medications: allMedications, allergies, chronicConditions };

    if (!geminiApiKey) {
      logger.warn('No API key, using fallback');
      analysisResult = getFallbackAnalysis(fullBody);
    } else {
      const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash'];
      let aiResponse: Response | null = null;

      for (const model of models) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1536,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (response.ok) {
          aiResponse = response;
          break;
        }
        if (response.status === 429) continue;
        await response.text(); // consume
      }

      if (aiResponse) {
        try {
          const aiData = await aiResponse.json();
          const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            analysisResult = {
              interactions: parsed.interactions || [],
              allergyWarnings: parsed.allergyWarnings || [],
              conditionWarnings: parsed.conditionWarnings || [],
              generalWarnings: parsed.generalWarnings || [],
              overallRisk: parsed.overallRisk || 'low',
              disclaimer: 'This AI-assisted analysis is for clinical decision support only. Always apply clinical judgment.',
            };
          } else {
            throw new Error('No JSON in response');
          }
        } catch {
          logger.warn('Parse failed, using fallback');
          analysisResult = getFallbackAnalysis(fullBody);
        }
      } else {
        analysisResult = getFallbackAnalysis(fullBody);
      }
    }

    // Merge fallback allergy/condition checks even with AI (in case AI missed)
    const fallback = getFallbackAnalysis(fullBody);
    
    // Add any fallback allergy warnings not already in AI result
    for (const fw of fallback.allergyWarnings) {
      if (!analysisResult.allergyWarnings.some(a => 
        a.medication.toLowerCase() === fw.medication.toLowerCase() && 
        a.allergy.toLowerCase() === fw.allergy.toLowerCase()
      )) {
        analysisResult.allergyWarnings.push(fw);
      }
    }
    
    // Add any fallback condition warnings not already in AI result
    for (const fw of fallback.conditionWarnings) {
      if (!analysisResult.conditionWarnings.some(c => 
        c.medication.toLowerCase() === fw.medication.toLowerCase() && 
        c.condition.toLowerCase() === fw.condition.toLowerCase()
      )) {
        analysisResult.conditionWarnings.push(fw);
      }
    }

    // Recalculate overall risk after merge
    const allSeverities = [
      ...analysisResult.interactions.map(i => i.severity),
      ...analysisResult.allergyWarnings.map(a => a.severity),
      ...analysisResult.conditionWarnings.map(c => c.severity),
    ];
    if (allSeverities.some(s => s === 'contraindicated' || s === 'severe')) {
      analysisResult.overallRisk = 'high';
    } else if (allSeverities.some(s => s === 'moderate') || allSeverities.length >= 2) {
      analysisResult.overallRisk = 'moderate';
    }

    const totalWarnings = analysisResult.interactions.length + 
      analysisResult.allergyWarnings.length + 
      analysisResult.conditionWarnings.length;

    logger.info('Smart check complete', { totalWarnings, risk: analysisResult.overallRisk });

    return new Response(
      JSON.stringify({ success: true, data: analysisResult, correlationId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } }
    );
  } catch (error) {
    logger.error('Error', { error: (error as Error).message });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
