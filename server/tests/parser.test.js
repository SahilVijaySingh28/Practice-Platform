import { describe, it, expect } from 'vitest';
import { parseSubmission, parseDesignText } from '../domain/parser.js';

describe('TextParser', () => {
  it('parses common class and relationship text', () => {
    const text = `
      class Vehicle {
        - licensePlate: String
        + start(): void
      }

      class Car extends Vehicle implements Drivable {
        - fuel: String
      }

      interface Drivable {
        + drive(): void
      }
    `;

    const graph = parseDesignText(text);

    expect(graph.classes.length).toBeGreaterThanOrEqual(2);
    expect(graph.interfaces).toContain('Drivable');
    expect(graph.relationships.some(r => r.kind === 'extends' || r.kind === 'implements')).toBe(true);
  });

  it('handles malformed or empty input without throwing', () => {
    expect(() => parseSubmission('')).not.toThrow();
    expect(() => parseSubmission('   ')).not.toThrow();
    expect(() => parseSubmission(null)).not.toThrow();

    const emptyGraph = parseSubmission('random text without classes');
    expect(emptyGraph.classes).toEqual([]);
    expect(emptyGraph.interfaces).toEqual([]);
    expect(emptyGraph.relationships).toEqual([]);
  });
});
