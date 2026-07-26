import assert from 'node:assert/strict';

import {
  employeeCodeConfigFromSettings,
  formatEmployeeCode,
  previewNextEmployeeCode,
  shouldAllocateEmployeeCode,
} from '../lib/employee-code';
import type { CompanySettings } from '../lib/appwrite/types';
import { DEFAULT_SETTINGS } from '../lib/appwrite/types';

function settings(overrides: Partial<CompanySettings> = {}): CompanySettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

console.log('employee-code unit tests\n');

test('formats code with padding', () => {
  const config = employeeCodeConfigFromSettings(
    settings({ employeeCodePrefix: 'EMP', employeeCodePadding: 4 }),
  );
  assert.equal(formatEmployeeCode(config, 1), 'EMP0001');
  assert.equal(formatEmployeeCode(config, 42), 'EMP0042');
});

test('preview uses nextSequence from settings', () => {
  assert.equal(
    previewNextEmployeeCode(settings({ employeeCodeNextSequence: 7 })),
    'EMP0007',
  );
});

test('should allocate when auto-generate is on and field is empty', () => {
  assert.equal(
    shouldAllocateEmployeeCode(
      settings({ employeeCodeAutoGenerate: true, employeeCodeNextSequence: 3 }),
      '',
    ),
    true,
  );
});

test('should allocate when submitted code matches stale preview', () => {
  const companySettings = settings({
    employeeCodeAutoGenerate: true,
    employeeCodeNextSequence: 3,
  });
  assert.equal(
    shouldAllocateEmployeeCode(companySettings, previewNextEmployeeCode(companySettings)),
    true,
  );
});

test('should not allocate when auto-generate is off', () => {
  assert.equal(
    shouldAllocateEmployeeCode(
      settings({ employeeCodeAutoGenerate: false }),
      '',
    ),
    false,
  );
});

test('should not allocate when admin entered a custom code', () => {
  assert.equal(
    shouldAllocateEmployeeCode(
      settings({ employeeCodeAutoGenerate: true, employeeCodeNextSequence: 3 }),
      'CUSTOM-99',
    ),
    false,
  );
});

test('simulates sequence advancing after two allocations', () => {
  let companySettings = settings({
    employeeCodeAutoGenerate: true,
    employeeCodeNextSequence: 1,
  });

  for (const expected of ['EMP0001', 'EMP0002']) {
    assert.equal(shouldAllocateEmployeeCode(companySettings, ''), true);
    const allocated = previewNextEmployeeCode(companySettings);
    assert.equal(allocated, expected);
    companySettings = {
      ...companySettings,
      employeeCodeNextSequence: (companySettings.employeeCodeNextSequence ?? 1) + 1,
    };
  }

  assert.equal(previewNextEmployeeCode(companySettings), 'EMP0003');
});

console.log(`\n${passed} passed`);
