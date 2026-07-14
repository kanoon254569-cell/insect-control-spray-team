import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePortalRole } from './auth';

test('team lead resolves to technician portal', () => {
  assert.equal(resolvePortalRole('team_lead'), 'technician');
});

test('team member resolves to technician portal', () => {
  assert.equal(resolvePortalRole('team_member'), 'technician');
});
