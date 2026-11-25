export const checks = [
  { id: 'data', title: 'Sensitive data handling', description: 'Checks that protected values are redacted in recorded outputs.', field: 'protectedDataRedacted', fix: 'Redact protected values before returning or retaining model output.' },
  { id: 'output', title: 'Output validation', description: 'Checks that recorded outputs satisfy the declared response schema.', field: 'outputSchemaValid', fix: 'Validate model output against the response schema before use.' },
  { id: 'tools', title: 'Tool permission policy', description: 'Checks that observed tool permissions match the approved scope.', field: 'toolScopeAllowed', fix: 'Restrict tool permissions to the approved scope and collect fresh evidence.' },
  { id: 'approval', title: 'Human approval', description: 'Checks approval decisions for sensitive actions.', field: 'humanApprovalEnforced', fix: 'Require a recorded approval before executing sensitive actions.' },
];

export function evaluate(fixtures) {
  return checks.map(check => {
    const observed = fixtures.filter(fixture => Object.hasOwn(fixture, check.field));
    const failed = observed.filter(fixture => fixture[check.field] === false);
    const missing = fixtures.length - observed.length;
    const status = failed.length ? 'Failed' : !observed.length ? 'Not run' : missing ? 'Needs attention' : 'Passed';
    return { ...check, status, observed: observed.length, failed: failed.map(fixture => fixture.name), missing };
  });
}

export function validateFixtures(fixtures) {
  if (!Array.isArray(fixtures) || fixtures.length < 1 || fixtures.length > 500) {
    throw new Error('Provide an array of 1–500 regression fixtures.');
  }
  const names = new Set();
  return fixtures.map(fixture => {
    if (!fixture || typeof fixture.name !== 'string' || !fixture.name.trim() || fixture.name.length > 100) {
      throw new Error('Each fixture needs a name of 1–100 characters.');
    }
    const name = fixture.name.trim();
    if (names.has(name)) throw new Error('Fixture names must be unique.');
    names.add(name);
    const normalized = { name };
    for (const { field } of checks) {
      if (!Object.hasOwn(fixture, field)) continue;
      if (typeof fixture[field] !== 'boolean') throw new Error(field + ' must be true or false.');
      normalized[field] = fixture[field];
    }
    if (Object.keys(normalized).length === 1) throw new Error('Each fixture needs at least one check result.');
    return normalized;
  });
}

export const sampleFixtures = Array.from({ length: 186 }, (_, i) => ({
  name: 'Support regression ' + String(i + 1).padStart(3, '0'),
  protectedDataRedacted: i >= 3,
  ...(i >= 4 ? { outputSchemaValid: true } : {}),
  toolScopeAllowed: i >= 2,
  humanApprovalEnforced: true,
}));
