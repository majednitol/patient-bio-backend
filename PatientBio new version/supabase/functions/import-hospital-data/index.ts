import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  hospitalId: string;
  importType: 'departments' | 'staff' | 'wards' | 'patients' | 'admissions' | 'invoices';
  csvContent: string;
  conflictResolution: 'merge' | 'replace' | 'skip';
  sendInvitations?: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  errors: { row: number; error: string }[];
  warnings: string[];
}

// CSV parsing function
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  
  return { headers, rows };
}

// Get user ID by email using service role
async function getUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_user_id_by_email', { p_email: email });
  if (error || !data) return null;
  return data;
}

// Import Departments
async function importDepartments(
  supabase: any,
  hospitalId: string,
  rows: Record<string, string>[],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, failed: 0, errors: [], warnings: [] };
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row['name'] || row['department_name'];
    const description = row['description'] || null;
    const headEmail = row['head_staff_email'] || row['head_email'] || null;
    
    if (!name) {
      result.errors.push({ row: i + 2, error: 'Missing department name' });
      result.failed++;
      continue;
    }
    
    try {
      // Check if department exists
      const { data: existing } = await supabase
        .from('hospital_departments')
        .select('id')
        .eq('hospital_id', hospitalId)
        .eq('name', name)
        .maybeSingle();
      
      if (existing && conflictResolution === 'skip') {
        result.skipped++;
        continue;
      }
      
      // Get head staff ID if email provided
      let headStaffId = null;
      if (headEmail) {
        const { data: staff } = await supabase
          .from('hospital_staff')
          .select('id')
          .eq('hospital_id', hospitalId)
          .eq('email', headEmail.toLowerCase())
          .maybeSingle();
        headStaffId = staff?.id || null;
        if (!staff) {
          result.warnings.push(`Row ${i + 2}: Head staff email not found: ${headEmail}`);
        }
      }
      
      if (existing && conflictResolution === 'replace') {
        await supabase
          .from('hospital_departments')
          .update({ name, description, head_staff_id: headStaffId, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else if (existing && conflictResolution === 'merge') {
        await supabase
          .from('hospital_departments')
          .update({ 
            description: description || undefined, 
            head_staff_id: headStaffId || undefined,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('hospital_departments')
          .insert({ hospital_id: hospitalId, name, description, head_staff_id: headStaffId });
      }
      
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, error: e.message || 'Database error' });
      result.failed++;
    }
  }
  
  return result;
}

// Import Staff
async function importStaff(
  supabase: any,
  hospitalId: string,
  rows: Record<string, string>[],
  conflictResolution: string,
  sendInvitations: boolean
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, failed: 0, errors: [], warnings: [] };
  
  // Get hospital info for invitations
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('name')
    .eq('id', hospitalId)
    .single();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row['name'] || row['full_name'];
    const email = (row['email'] || '').toLowerCase();
    const role = row['role'] || 'staff';
    const departmentName = row['department_name'] || row['department'];
    const employeeId = row['employee_id'] || null;
    const specialty = row['specialty'] || null;
    const licenseNumber = row['license_number'] || null;
    
    if (!name || !email) {
      result.errors.push({ row: i + 2, error: 'Missing name or email' });
      result.failed++;
      continue;
    }
    
    try {
      // Check if staff exists
      const { data: existing } = await supabase
        .from('hospital_staff')
        .select('id')
        .eq('hospital_id', hospitalId)
        .eq('email', email)
        .maybeSingle();
      
      if (existing && conflictResolution === 'skip') {
        result.skipped++;
        continue;
      }
      
      // Get department ID
      let departmentId = null;
      if (departmentName) {
        const { data: dept } = await supabase
          .from('hospital_departments')
          .select('id')
          .eq('hospital_id', hospitalId)
          .eq('name', departmentName)
          .maybeSingle();
        departmentId = dept?.id || null;
      }
      
      // Check if user exists
      const userId = await getUserIdByEmail(supabase, email);
      
      const staffData = {
        hospital_id: hospitalId,
        name,
        email,
        role,
        department_id: departmentId,
        employee_id: employeeId,
        user_id: userId,
        is_active: true,
      };
      
      if (existing) {
        if (conflictResolution === 'replace') {
          await supabase
            .from('hospital_staff')
            .update({ ...staffData, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else if (conflictResolution === 'merge') {
          await supabase
            .from('hospital_staff')
            .update({ 
              name,
              department_id: departmentId || undefined,
              employee_id: employeeId || undefined,
              user_id: userId || undefined,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id);
        }
      } else {
        const { data: newStaff } = await supabase
          .from('hospital_staff')
          .insert(staffData)
          .select('id')
          .single();
        
        // Create doctor profile if role is doctor
        if (role === 'doctor' && userId) {
          const { data: existingProfile } = await supabase
            .from('doctor_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (!existingProfile) {
            await supabase
              .from('doctor_profiles')
              .insert({
                user_id: userId,
                full_name: name,
                specialty,
                license_number: licenseNumber,
              });
          }
        }
        
        // Send invitation if user doesn't exist
        if (!userId && sendInvitations) {
          try {
            await supabase.functions.invoke('send-staff-invitation', {
              body: {
                staffId: newStaff.id,
                email,
                name,
                hospitalName: hospital?.name || 'Hospital',
                role,
              },
            });
            result.warnings.push(`Row ${i + 2}: Invitation sent to ${email}`);
          } catch (inviteError: any) {
            result.warnings.push(`Row ${i + 2}: Failed to send invitation to ${email}`);
          }
        }
      }
      
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, error: e.message || 'Database error' });
      result.failed++;
    }
  }
  
  return result;
}

// Import Wards & Beds
async function importWardsAndBeds(
  supabase: any,
  hospitalId: string,
  rows: Record<string, string>[],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, failed: 0, errors: [], warnings: [] };
  const wardCache: Record<string, string> = {};
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const wardName = row['ward_name'] || row['ward'];
    const wardDescription = row['ward_description'] || null;
    const bedNumber = row['bed_number'] || row['bed'];
    const bedType = row['bed_type'] || 'standard';
    const dailyRate = row['daily_rate'] ? parseFloat(row['daily_rate']) : null;
    
    if (!wardName || !bedNumber) {
      result.errors.push({ row: i + 2, error: 'Missing ward name or bed number' });
      result.failed++;
      continue;
    }
    
    try {
      // Get or create ward
      let wardId = wardCache[wardName];
      if (!wardId) {
        const { data: existingWard } = await supabase
          .from('wards')
          .select('id')
          .eq('hospital_id', hospitalId)
          .eq('name', wardName)
          .maybeSingle();
        
        if (existingWard) {
          wardId = existingWard.id;
        } else {
          const { data: newWard } = await supabase
            .from('wards')
            .insert({ hospital_id: hospitalId, name: wardName, description: wardDescription })
            .select('id')
            .single();
          wardId = newWard.id;
        }
        wardCache[wardName] = wardId;
      }
      
      // Check if bed exists
      const { data: existingBed } = await supabase
        .from('beds')
        .select('id')
        .eq('hospital_id', hospitalId)
        .eq('ward_id', wardId)
        .eq('bed_number', bedNumber)
        .maybeSingle();
      
      if (existingBed && conflictResolution === 'skip') {
        result.skipped++;
        continue;
      }
      
      const bedData = {
        hospital_id: hospitalId,
        ward_id: wardId,
        bed_number: bedNumber,
        bed_type: bedType,
        daily_rate: dailyRate,
        status: 'available',
      };
      
      if (existingBed) {
        await supabase
          .from('beds')
          .update({ ...bedData, updated_at: new Date().toISOString() })
          .eq('id', existingBed.id);
      } else {
        await supabase.from('beds').insert(bedData);
      }
      
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, error: e.message || 'Database error' });
      result.failed++;
    }
  }
  
  return result;
}

// Import Patient Registry
async function importPatients(
  supabase: any,
  hospitalId: string,
  rows: Record<string, string>[],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, failed: 0, errors: [], warnings: [] };
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ghpid = row['ghpid'] || row['patient_passport_id'] || null;
    const patientName = row['patient_name'] || row['name'];
    const patientEmail = (row['patient_email'] || row['email'] || '').toLowerCase();
    const dob = row['date_of_birth'] || row['dob'] || null;
    const phone = row['phone'] || null;
    const gender = row['gender'] || null;
    
    if (!patientEmail) {
      result.errors.push({ row: i + 2, error: 'Missing patient email' });
      result.failed++;
      continue;
    }
    
    try {
      // Try to match patient
      let patientId: string | null = null;
      
      // Strategy 1: Match by GHPID
      if (ghpid) {
        const { data: byGhpid } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('patient_passport_id', ghpid)
          .maybeSingle();
        if (byGhpid) patientId = byGhpid.id;
      }
      
      // Strategy 2: Match by email
      if (!patientId) {
        const userId = await getUserIdByEmail(supabase, patientEmail);
        if (userId) {
          const { data: byEmail } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          if (byEmail) patientId = byEmail.id;
        }
      }
      
      // Strategy 3: Match by name + DOB
      if (!patientId && patientName && dob) {
        const { data: byNameDob } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('display_name', patientName)
          .eq('date_of_birth', dob)
          .maybeSingle();
        if (byNameDob) patientId = byNameDob.id;
      }
      
      if (patientId) {
        // Check existing access request
        const { data: existingRequest } = await supabase
          .from('data_access_requests')
          .select('id, status')
          .eq('patient_id', patientId)
          .eq('requester_id', hospitalId)
          .eq('requester_type', 'hospital')
          .maybeSingle();
        
        if (existingRequest && conflictResolution === 'skip') {
          result.skipped++;
          continue;
        }
        
        if (!existingRequest) {
          await supabase.from('data_access_requests').insert({
            patient_id: patientId,
            requester_id: hospitalId,
            requester_type: 'hospital',
            reason: 'Patient registry import',
            status: 'pending',
          });
        }
        
        result.imported++;
        result.warnings.push(`Row ${i + 2}: Patient matched - ${patientEmail}`);
      } else {
        result.errors.push({ row: i + 2, error: `Patient not found: ${patientEmail}` });
        result.failed++;
      }
    } catch (e: any) {
      result.errors.push({ row: i + 2, error: e.message || 'Database error' });
      result.failed++;
    }
  }
  
  return result;
}

// Import Admissions
async function importAdmissions(
  supabase: any,
  hospitalId: string,
  rows: Record<string, string>[],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, failed: 0, errors: [], warnings: [] };
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const patientEmail = (row['patient_email'] || '').toLowerCase();
    const admissionDate = row['admission_date'];
    const expectedDischarge = row['expected_discharge'] || null;
    const admissionReason = row['admission_reason'] || null;
    const diagnosis = row['diagnosis'] || null;
    const doctorEmail = (row['doctor_email'] || '').toLowerCase();
    const bedNumber = row['bed_number'] || null;
    const wardName = row['ward_name'] || null;
    const status = row['status'] || 'admitted';
    
    if (!patientEmail || !admissionDate || !doctorEmail) {
      result.errors.push({ row: i + 2, error: 'Missing patient email, admission date, or doctor email' });
      result.failed++;
      continue;
    }
    
    try {
      // Get patient ID
      const patientUserId = await getUserIdByEmail(supabase, patientEmail);
      if (!patientUserId) {
        result.errors.push({ row: i + 2, error: `Patient not found: ${patientEmail}` });
        result.failed++;
        continue;
      }
      
      // Get doctor ID
      const doctorUserId = await getUserIdByEmail(supabase, doctorEmail);
      if (!doctorUserId) {
        result.errors.push({ row: i + 2, error: `Doctor not found: ${doctorEmail}` });
        result.failed++;
        continue;
      }
      
      // Get doctor profile ID
      const { data: doctorProfile } = await supabase
        .from('doctor_profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .maybeSingle();
      
      if (!doctorProfile) {
        result.errors.push({ row: i + 2, error: `Doctor profile not found: ${doctorEmail}` });
        result.failed++;
        continue;
      }
      
      // Get bed ID if specified
      let bedId = null;
      if (bedNumber && wardName) {
        const { data: ward } = await supabase
          .from('wards')
          .select('id')
          .eq('hospital_id', hospitalId)
          .eq('name', wardName)
          .maybeSingle();
        
        if (ward) {
          const { data: bed } = await supabase
            .from('beds')
            .select('id')
            .eq('ward_id', ward.id)
            .eq('bed_number', bedNumber)
            .maybeSingle();
          bedId = bed?.id || null;
        }
      }
      
      // Check for existing admission
      const { data: existingAdmission } = await supabase
        .from('admissions')
        .select('id')
        .eq('hospital_id', hospitalId)
        .eq('patient_id', patientUserId)
        .eq('admission_date', admissionDate)
        .maybeSingle();
      
      if (existingAdmission && conflictResolution === 'skip') {
        result.skipped++;
        continue;
      }
      
      const admissionData = {
        hospital_id: hospitalId,
        patient_id: patientUserId,
        admitting_doctor_id: doctorProfile.id,
        admission_date: admissionDate,
        expected_discharge: expectedDischarge,
        admission_reason: admissionReason,
        diagnosis,
        bed_id: bedId,
        status: status as 'admitted' | 'discharged',
      };
      
      if (existingAdmission) {
        await supabase
          .from('admissions')
          .update({ ...admissionData, updated_at: new Date().toISOString() })
          .eq('id', existingAdmission.id);
      } else {
        await supabase.from('admissions').insert(admissionData);
      }
      
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, error: e.message || 'Database error' });
      result.failed++;
    }
  }
  
  return result;
}

// Import Invoices
async function importInvoices(
  supabase: any,
  hospitalId: string,
  rows: Record<string, string>[],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, failed: 0, errors: [], warnings: [] };
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const patientEmail = (row['patient_email'] || '').toLowerCase();
    const invoiceDate = row['invoice_date'] || new Date().toISOString().split('T')[0];
    const subtotal = parseFloat(row['subtotal'] || '0');
    const taxAmount = parseFloat(row['tax_amount'] || '0');
    const discountAmount = parseFloat(row['discount_amount'] || '0');
    const notes = row['notes'] || null;
    const admissionId = row['admission_id'] || null;
    
    if (!patientEmail || isNaN(subtotal)) {
      result.errors.push({ row: i + 2, error: 'Missing patient email or invalid subtotal' });
      result.failed++;
      continue;
    }
    
    try {
      // Get patient ID
      const patientUserId = await getUserIdByEmail(supabase, patientEmail);
      if (!patientUserId) {
        result.errors.push({ row: i + 2, error: `Patient not found: ${patientEmail}` });
        result.failed++;
        continue;
      }
      
      const totalAmount = subtotal + taxAmount - discountAmount;
      
      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', { 
        p_hospital_id: hospitalId 
      });
      
      const invoiceData = {
        hospital_id: hospitalId,
        patient_id: patientUserId,
        admission_id: admissionId,
        invoice_number: invoiceNumber,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        notes,
        status: 'draft',
        issue_date: invoiceDate,
      };
      
      await supabase.from('invoices').insert(invoiceData);
      result.imported++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, error: e.message || 'Database error' });
      result.failed++;
    }
  }
  
  return result;
}

// Log import
async function logImport(
  supabase: any,
  hospitalId: string,
  importType: string,
  result: ImportResult,
  userId: string
): Promise<void> {
  try {
    await supabase.from('provider_import_logs').insert({
      provider_type: 'hospital',
      provider_id: hospitalId,
      import_type: importType,
      file_name: `${importType}_import.csv`,
      total_records: result.imported + result.skipped + result.failed,
      imported_count: result.imported,
      skipped_count: result.skipped,
      error_count: result.failed,
      status: result.failed > 0 ? 'completed_with_errors' : 'completed',
      error_details: result.errors.length > 0 ? result.errors : null,
      imported_by: userId,
    });
  } catch (e) {
    console.error('Failed to log import:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const body: ImportRequest = await req.json();
    const { hospitalId, importType, csvContent, conflictResolution, sendInvitations = false } = body;
    
    // Verify user is hospital staff
    const { data: staffCheck } = await supabase
      .from('hospital_staff')
      .select('id, role')
      .eq('hospital_id', hospitalId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    
    if (!staffCheck) {
      return new Response(JSON.stringify({ error: 'Not authorized for this hospital' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Parse CSV
    const { headers, rows } = parseCSV(csvContent);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid rows in CSV' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Processing ${importType} import with ${rows.length} rows`);
    
    let result: ImportResult;
    
    switch (importType) {
      case 'departments':
        result = await importDepartments(supabase, hospitalId, rows, conflictResolution);
        break;
      case 'staff':
        result = await importStaff(supabase, hospitalId, rows, conflictResolution, sendInvitations);
        break;
      case 'wards':
        result = await importWardsAndBeds(supabase, hospitalId, rows, conflictResolution);
        break;
      case 'patients':
        result = await importPatients(supabase, hospitalId, rows, conflictResolution);
        break;
      case 'admissions':
        result = await importAdmissions(supabase, hospitalId, rows, conflictResolution);
        break;
      case 'invoices':
        result = await importInvoices(supabase, hospitalId, rows, conflictResolution);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid import type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    // Log the import
    await logImport(supabase, hospitalId, importType, result, user.id);
    
    console.log(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
