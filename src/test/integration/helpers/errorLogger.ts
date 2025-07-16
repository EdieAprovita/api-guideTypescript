export const logTestError = (context: string, error: unknown): void => {
  if (error instanceof Error && error.name === 'ValidationError') {
    console.error(`Validation error in ${context}:`, error.message);
  } else {
    console.error(`Error in ${context}:`, error);
  }
};
