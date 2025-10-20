import { supabase, EXPECTED_PROJECT_ID } from './supabase';

export interface DatabaseIdentity {
  id: string;
  project_id: string;
  project_name: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  isValid: boolean;
  expectedProjectId: string;
  actualProjectId: string | null;
  projectName: string | null;
  environment: string | null;
  error?: string;
}

export async function validateDatabaseConnection(): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('database_identity')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Database validation query failed:', error);
      return {
        isValid: false,
        expectedProjectId: EXPECTED_PROJECT_ID,
        actualProjectId: null,
        projectName: null,
        environment: null,
        error: `Failed to query database identity: ${error.message}`,
      };
    }

    if (!data) {
      console.error('❌ No database identity record found');
      return {
        isValid: false,
        expectedProjectId: EXPECTED_PROJECT_ID,
        actualProjectId: null,
        projectName: null,
        environment: null,
        error: 'Database identity record not found. This database may not be properly initialized.',
      };
    }

    const isValid = data.project_id === EXPECTED_PROJECT_ID;

    if (!isValid) {
      console.error('❌ DATABASE MISMATCH DETECTED!');
      console.error(`Expected: ${EXPECTED_PROJECT_ID}`);
      console.error(`Found: ${data.project_id}`);
      console.error(`Project Name: ${data.project_name}`);
    } else {
      console.log('✅ Database identity validated successfully');
      console.log(`✅ Project: ${data.project_name} (${data.project_id})`);
      console.log(`✅ Environment: ${data.environment}`);
    }

    return {
      isValid,
      expectedProjectId: EXPECTED_PROJECT_ID,
      actualProjectId: data.project_id,
      projectName: data.project_name,
      environment: data.environment,
      error: isValid ? undefined : `Wrong database! Expected ${EXPECTED_PROJECT_ID}, found ${data.project_id}`,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Database validation exception:', err);
    return {
      isValid: false,
      expectedProjectId: EXPECTED_PROJECT_ID,
      actualProjectId: null,
      projectName: null,
      environment: null,
      error: `Validation exception: ${errorMessage}`,
    };
  }
}

export async function getDatabaseInfo(): Promise<DatabaseIdentity | null> {
  try {
    const { data, error } = await supabase
      .from('database_identity')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch database info:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception fetching database info:', err);
    return null;
  }
}
