export const isNewResource = (createdAt?: string) => {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const diffHours = (now - createdTime) / (1000 * 60 * 60);
  return diffHours <= 72; // Within 3 days
};

export const checkAndIncrementNewResourceVisits = (userId: string, assignments: Array<{ id: string; createdAt?: string }>) => {
  if (!userId || !assignments || assignments.length === 0) return;
  
  const sessionKey = `session_counted_${userId}`;
  const hasCountedThisSession = sessionStorage.getItem(sessionKey);

  if (!hasCountedThisSession) {
    sessionStorage.setItem(sessionKey, 'true');

    assignments.forEach(assignment => {
      if (isNewResource(assignment.createdAt)) {
        const storageKey = `res_visits_${userId}_${assignment.id}`;
        const currentVisits = parseInt(localStorage.getItem(storageKey) || '0', 10);
        localStorage.setItem(storageKey, (currentVisits + 1).toString());
      }
    });
  }
};

export const shouldShowNewBadge = (userId: string | undefined, assignment: { id: string; createdAt?: string }) => {
  if (!userId || !isNewResource(assignment.createdAt)) return false;
  const storageKey = `res_visits_${userId}_${assignment.id}`;
  const visits = parseInt(localStorage.getItem(storageKey) || '0', 10);
  return visits < 5;
};
