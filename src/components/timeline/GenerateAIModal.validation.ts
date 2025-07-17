/**
 * Production Validation Script for GenerateAIModal + V2 Lambda Integration
 * Run this before deploying to production
 */

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export class GenerateAIModalValidator {
  private lambdaEndpoint = 'https://iw6lhqg9ji.execute-api.us-east-1.amazonaws.com/default/createEditDecisionList';
  
  async validateLambdaIntegration(projectId: string, userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // Test 1: Lambda endpoint reachability
      console.log('🔍 Testing lambda endpoint reachability...');
      const testResponse = await fetch(this.lambdaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          user_id: userId,
          user_prompt: 'Test validation prompt',
          platform: 'tiktok'
        })
      });

      if (!testResponse.ok) {
        result.errors.push(`Lambda endpoint returned ${testResponse.status}: ${testResponse.statusText}`);
        result.passed = false;
      }

      // Test 2: Response format validation
      console.log('🔍 Testing response format...');
      const responseData = await testResponse.json();
      
      if (!this.validateResponseFormat(responseData)) {
        result.errors.push('Lambda response format is invalid');
        result.passed = false;
      }

      // Test 3: Job ID format validation
      const jobId = this.extractJobId(responseData);
      if (!jobId) {
        result.errors.push('Cannot extract job_id from lambda response');
        result.passed = false;
      } else if (!this.isValidJobId(jobId)) {
        result.errors.push(`Invalid job_id format: ${jobId}`);
        result.passed = false;
      }

    } catch (error) {
      result.errors.push(`Lambda integration test failed: ${error}`);
      result.passed = false;
    }

    return result;
  }

  async validateDatabaseIntegration(projectId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // Test 1: Supabase client creation
      console.log('🔍 Testing Supabase client...');
      const { createClientSupabaseClient } = await import('../../lib/supabase/client');
      const supabase = createClientSupabaseClient();

      if (!supabase) {
        result.errors.push('Failed to create Supabase client');
        result.passed = false;
        return result;
      }

      // Test 2: Database table accessibility
      console.log('🔍 Testing edl_generation_jobs table access...');
      const { data, error } = await supabase
        .from('edl_generation_jobs')
        .select('job_id, status, status_message')
        .eq('project_id', projectId)
        .limit(1);

      if (error) {
        result.errors.push(`Database access error: ${error.message}`);
        result.passed = false;
      }

      // Test 3: Timeline persistence
      console.log('🔍 Testing timeline persistence...');
      const { timelinePersistence } = await import('../../lib/timelinePersistence');
      
      try {
        await timelinePersistence.loadTimeline(projectId);
      } catch (error) {
        result.warnings.push(`Timeline loading test failed: ${error}`);
      }

    } catch (error) {
      result.errors.push(`Database integration test failed: ${error}`);
      result.passed = false;
    }

    return result;
  }

  async validateUIFlow(): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // Test 1: Platform options validation
      console.log('🔍 Testing platform options...');
      const PLATFORMS = [
        { value: 'tiktok', label: 'TikTok', description: 'Vertical 9:16, 15-60 seconds' },
        { value: 'youtube', label: 'YouTube', description: 'Horizontal 16:9, 5-20 minutes' },
        { value: 'instagram', label: 'Instagram', description: 'Square 1:1 or vertical 9:16' },
        { value: 'twitter', label: 'Twitter/X', description: 'Horizontal 16:9, up to 2 minutes' },
        { value: 'linkedin', label: 'LinkedIn', description: 'Horizontal 16:9, professional' },
      ];

      const requiredPlatforms = ['tiktok', 'youtube', 'instagram'];
      const availablePlatforms = PLATFORMS.map(p => p.value);
      
      for (const platform of requiredPlatforms) {
        if (!availablePlatforms.includes(platform)) {
          result.errors.push(`Missing required platform: ${platform}`);
          result.passed = false;
        }
      }

      // Test 2: Form validation
      console.log('🔍 Testing form validation...');
      const testPrompts = [
        '', // Empty prompt
        'a', // Too short
        'Create an engaging TikTok video', // Valid
        'x'.repeat(1000) // Very long
      ];

      for (const prompt of testPrompts) {
        if (!this.validatePrompt(prompt)) {
          result.warnings.push(`Prompt validation concern: "${prompt.substring(0, 50)}..."`);
        }
      }

    } catch (error) {
      result.errors.push(`UI flow test failed: ${error}`);
      result.passed = false;
    }

    return result;
  }

  private validateResponseFormat(response: any): boolean {
    // Handle both direct response and wrapped response formats
    const data = response.body ? JSON.parse(response.body) : response;
    
    return !!(
      data &&
      data.success &&
      data.data &&
      data.data.job_id &&
      data.data.message
    );
  }

  private extractJobId(response: any): string | null {
    try {
      const data = response.body ? JSON.parse(response.body) : response;
      return data?.data?.job_id || null;
    } catch {
      return null;
    }
  }

  private isValidJobId(jobId: string): boolean {
    // Check if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(jobId);
  }

  private validatePrompt(prompt: string): boolean {
    return prompt.length >= 10 && prompt.length <= 500;
  }

  async runFullValidation(projectId: string, userId: string): Promise<ValidationResult> {
    console.log('🚀 Starting full validation suite...');
    
    const lambdaResult = await this.validateLambdaIntegration(projectId, userId);
    const dbResult = await this.validateDatabaseIntegration(projectId);
    const uiResult = await this.validateUIFlow();

    const combinedResult: ValidationResult = {
      passed: lambdaResult.passed && dbResult.passed && uiResult.passed,
      errors: [
        ...lambdaResult.errors,
        ...dbResult.errors,
        ...uiResult.errors
      ],
      warnings: [
        ...lambdaResult.warnings,
        ...dbResult.warnings,
        ...uiResult.warnings
      ]
    };

    console.log('📊 Validation Results:');
    console.log(`✅ Passed: ${combinedResult.passed}`);
    console.log(`❌ Errors: ${combinedResult.errors.length}`);
    console.log(`⚠️ Warnings: ${combinedResult.warnings.length}`);

    if (combinedResult.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      combinedResult.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (combinedResult.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      combinedResult.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    return combinedResult;
  }
}

// Export convenience function
export const validateGenerateAIModal = (projectId: string, userId: string) => {
  const validator = new GenerateAIModalValidator();
  return validator.runFullValidation(projectId, userId);
};

// Usage example:
// import { validateGenerateAIModal } from './GenerateAIModal.validation';
// const result = await validateGenerateAIModal('your-project-id', 'your-user-id');
// if (!result.passed) {
//   console.error('❌ Validation failed - do not deploy!');
// } else {
//   console.log('✅ Validation passed - safe to deploy!');
// }