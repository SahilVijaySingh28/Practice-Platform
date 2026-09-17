import { describe, it, expect } from 'vitest';
import { deterministicEvaluate } from '../domain/evaluator.js';

describe('deterministicEvaluate', () => {
  const rubric = {
    expectedInterfaces: ['Parkable', 'Ticketing'],
    requirementChecklist: [
      { id: 'parking', description: 'parking spaces' },
      { id: 'vehicle', description: 'vehicle entry and exit' },
      { id: 'ticket', description: 'ticket generation' }
    ],
    patternHints: ['Use a parking spot manager', 'Separate gate logic from ticketing']
  };

  it('returns strong coverage when requirements are present', () => {
    const graph = {
      classes: [
        { name: 'ParkingLot', fields: ['spots', 'vehicles'], methods: ['parkVehicle', 'removeVehicle'] },
        { name: 'TicketMachine', fields: ['ticket'], methods: ['issueTicket'] }
      ],
      interfaces: ['Parkable', 'Ticketing'],
      relationships: [{ from: 'ParkingLot', to: 'TicketMachine', kind: 'uses' }]
    };

    const feedback = deterministicEvaluate(graph, rubric);

    expect(feedback.some(d => d.name === 'Requirement Coverage')).toBe(true);
    expect(feedback.some(d => d.name === 'Interface Coverage')).toBe(true);
    expect(feedback.some(d => d.name === 'God Class')).toBe(false);
  });

  it('flags partial coverage when requirements are missing', () => {
    const graph = {
      classes: [
        { name: 'ParkingLot', fields: ['spots'], methods: ['parkVehicle'] }
      ],
      interfaces: [],
      relationships: []
    };

    const feedback = deterministicEvaluate(graph, rubric);
    const reqDim = feedback.find(d => d.name === 'Requirement Coverage');

    expect(reqDim.score).toBeLessThan(100);
    expect(reqDim.evidence).toMatch(/missing|coverage/i);
  });

  it('flags a God Class when one class dominates structure', () => {
    const graph = {
      classes: [
        { name: 'GodManager', fields: ['a', 'b', 'c', 'd', 'e', 'f'], methods: ['m1', 'm2', 'm3', 'm4', 'm5'] },
        { name: 'SimpleThing', fields: ['x'], methods: ['run'] }
      ],
      interfaces: [],
      relationships: []
    };

    const feedback = deterministicEvaluate(graph, rubric);
    const godClass = feedback.find(d => d.name === 'God Class');

    expect(godClass).toBeTruthy();
    expect(godClass.score).toBeLessThan(50);
  });

  it('handles empty or near-empty submissions gracefully', () => {
    const empty = deterministicEvaluate({ classes: [], interfaces: [], relationships: [] }, rubric);
    const nearEmpty = deterministicEvaluate({ classes: [{ name: 'Thing', fields: [], methods: [] }], interfaces: [], relationships: [] }, rubric);

    expect(empty.some(d => d.name === 'Requirement Coverage')).toBe(true);
    expect(nearEmpty.some(d => d.name === 'Requirement Coverage')).toBe(true);
  });
});
