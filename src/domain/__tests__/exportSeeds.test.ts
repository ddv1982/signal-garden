import { describe, expect, it } from 'vitest';
import { seedExportFilename, serializeSeedExport } from '../exportSeeds';

describe('seed export domain', () => {
  it('serializes seed exports with app metadata', () => {
    const json = serializeSeedExport([], '2026-06-09T10:00:00.000Z');

    expect(JSON.parse(json)).toMatchObject({
      app: 'Signal Garden',
      version: 1,
      exportedAt: '2026-06-09T10:00:00.000Z',
      seedCount: 0,
      seeds: [],
    });
  });

  it('uses the local calendar date for export filenames', () => {
    const localDate = new Date(2026, 5, 9, 0, 30);

    expect(seedExportFilename(localDate)).toBe('signal-garden-seeds-2026-06-09.json');
  });
});
