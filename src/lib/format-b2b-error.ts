/**
 * Utility to sanitize and map technical database errors, Supabase errors,
 * and constraint violations into clear, user-friendly messages for B2B wholesale.
 */

export function formatUserFriendlyB2BError(err: unknown): string {
  if (!err) {
    return 'An unexpected issue occurred while processing your wholesale application. Please try again.';
  }

  const rawMessage = (
    typeof err === 'string'
      ? err
      : (err as any)?.message || (err as any)?.error_description || (err as any)?.details || ''
  ).toLowerCase().trim();

  // 1. Not-null constraint violations (e.g. null value in column "b2bDocuments"...)
  if (rawMessage.includes('violates not-null constraint') || rawMessage.includes('null value in column')) {
    if (rawMessage.includes('b2bdocuments') || rawMessage.includes('document')) {
      return 'Please ensure required business documents or notes are provided.';
    }
    if (rawMessage.includes('businessname')) {
      return 'Please provide your registered Legal Business Name.';
    }
    if (rawMessage.includes('name')) {
      return 'Please provide the applicant or representative full name.';
    }
    if (rawMessage.includes('phone') || rawMessage.includes('email')) {
      return 'Please provide a valid contact email and phone number for verification.';
    }
    return 'Some required business fields were missing. Please review all required fields and try again.';
  }

  // 2. Unique constraint / duplicate record violations
  if (
    rawMessage.includes('violates unique constraint') ||
    rawMessage.includes('duplicate key') ||
    rawMessage.includes('already exists')
  ) {
    if (rawMessage.includes('email')) {
      return 'A wholesale account with this email address already exists. Please sign in to view your application status.';
    }
    if (rawMessage.includes('phone')) {
      return 'A wholesale account with this mobile number already exists. Please sign in or use an alternative contact number.';
    }
    if (rawMessage.includes('gstin')) {
      return 'An account with this GSTIN is already registered. Please sign in or contact wholesale support.';
    }
    return 'An account with these business details is already registered. Please sign in to your existing account or contact wholesale support.';
  }

  // 3. Check constraint or invalid syntax / type format errors
  if (rawMessage.includes('check constraint') || rawMessage.includes('invalid input syntax')) {
    return 'One or more fields have an invalid format. Please check your GSTIN, PAN, and contact information.';
  }

  // 4. Foreign key constraint
  if (rawMessage.includes('violates foreign key constraint') || rawMessage.includes('foreign key')) {
    return 'We were unable to link this application to your verified account. Please sign out, log back in, and try again.';
  }

  // 5. Network, fetch, or connection timeouts
  if (
    rawMessage.includes('fetch failed') ||
    rawMessage.includes('network') ||
    rawMessage.includes('econnrefused') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('connection refused')
  ) {
    return 'Unable to reach the wholesale verification service. Please check your internet connection and try again.';
  }

  // 6. Auth / Session expiration
  if (
    rawMessage.includes('jwt') ||
    rawMessage.includes('unauthorized') ||
    rawMessage.includes('session expired') ||
    rawMessage.includes('token')
  ) {
    return 'Your login session has expired. Please sign in again to submit your wholesale application.';
  }

  // 7. Generic database/technical terms that should never leak to users
  const technicalKeywords = [
    'relation',
    'column',
    'table',
    'schema',
    'postgres',
    'supabase',
    'prisma',
    'syntax error',
    'select ',
    'insert into',
    'update ',
    'delete from',
    'sqlstate',
    'constraint',
    'violates',
  ];
  if (technicalKeywords.some((kw) => rawMessage.includes(kw))) {
    return 'We encountered a system processing error while saving your application. Our technical team has been notified. Please try again or contact b2b@carxen.in.';
  }

  // 8. If it's already a clean human-readable message without SQL keywords, return it
  if (typeof err === 'string' && err.length > 0 && err.length < 160) {
    return err;
  }
  if (
    typeof (err as any)?.message === 'string' &&
    (err as any).message.length > 0 &&
    (err as any).message.length < 160
  ) {
    return (err as any).message;
  }

  return 'Failed to submit wholesale application. Please check your details and try again, or reach out to b2b@carxen.in.';
}
