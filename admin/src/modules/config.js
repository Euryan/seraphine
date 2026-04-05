const configuredApiBase = import.meta.env.VITE_API_BASE_URL;

const resolvedApiBase = configuredApiBase
	|| (import.meta.env.DEV ? '/api' : `${window.location.origin}/api`);

export const API_BASE = resolvedApiBase.replace(/\/$/, '');