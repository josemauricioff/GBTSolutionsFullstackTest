import { HttpErrorResponse } from '@angular/common/http';

interface ApiProblem {
  detail?: string;
  title?: string;
  errors?: Record<string, string[]>;
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse))
    return 'An unexpected error occurred. Please try again.';
  if (error.status === 0)
    return 'The API could not be reached. Check that the API is running and try again.';
  const problem = error.error as ApiProblem | null;
  if (problem && typeof problem === 'object') {
    if (problem.errors) return Object.values(problem.errors).flat().join(' ');
    if (problem.detail) return problem.detail;
    if (problem.title) return problem.title;
  }
  if (error.status === 404) return 'The product could not be found. It may have been deleted.';
  if (error.status === 409)
    return 'The operation conflicts with the current stock. Refresh the product and try again.';
  return 'The request could not be completed. Please try again.';
}
