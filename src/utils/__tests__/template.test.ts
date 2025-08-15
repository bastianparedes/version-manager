import { describe, it, expect } from 'vitest';
import { getFilledTemplate } from '../template';

describe('getFilledTemplate', () => {
  it('should replace a single variable', () => {
    const template = 'Hola, {name}!';
    const variables = { name: 'Bastián' };
    const result = getFilledTemplate(template, variables);
    expect(result).toBe('Hola, Bastián!');
  });

  it('should replace multiple variables', () => {
    const template = 'Hola, {name}. Tienes {age} años y vives en {city}.';
    const variables = { name: 'Bastián', age: '30', city: 'Puerto Montt' };
    const result = getFilledTemplate(template, variables);
    expect(result).toBe('Hola, Bastián. Tienes 30 años y vives en Puerto Montt.');
  });

  it('should leave variables not provided unchanged', () => {
    const template = 'Hola, {name}. Bienvenido a {city}.';
    const variables = { name: 'Bastián' };
    const result = getFilledTemplate(template, variables);
    expect(result).toBe('Hola, Bastián. Bienvenido a {city}.');
  });

  it('should ignore undefined values', () => {
    const template = 'Hola, {name}.';
    const variables = { name: undefined };
    const result = getFilledTemplate(template, variables);
    expect(result).toBe('Hola, {name}.');
  });

  it('should replace multiple occurrences of the same variable', () => {
    const template = '{word} es {word}.';
    const variables = { word: 'importante' };
    const result = getFilledTemplate(template, variables);
    expect(result).toBe('importante es importante.');
  });

  it('should return template unchanged if variables is empty', () => {
    const template = 'Hola, {name}!';
    const variables = {};
    const result = getFilledTemplate(template, variables);
    expect(result).toBe('Hola, {name}!');
  });
});
