// Simple Lead Scoring Logic
export const calculateLeadScore = (business: any): number => {
  let score = 0;

  if (business.rating) {
      score += business.rating * 10; // Max 50
  }

  if (business.phone) {
      score += 20;
  }

  if (business.message_sent) {
      score += 10;
  }

  // Cap at 100
  return Math.min(score, 100);
};
