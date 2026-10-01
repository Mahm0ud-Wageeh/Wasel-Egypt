import { describe, it, expect } from 'vitest';
import { parseEgyptianTransitQuery } from '../utils/egyptianQueryParser';

describe('Egyptian Arabic & Multilingual Query Parser', () => {
  it('parses full natural egyptian transit questions', () => {
    const res = parseEgyptianTransitQuery('أنا في فيصل وعايز أروح جامعة القاهرة');
    expect(res.is_natural_query).toBe(true);
    expect(res.origin).toBe('فيصل');
    expect(res.destination).toBe('جامعة القاهرة');
  });

  it('parses prepositional queries (من ... إلى / لـ...) with Ta Marbouta restoration', () => {
    const res = parseEgyptianTransitQuery('من الفيوم لميدان الجيزة');
    expect(res.is_natural_query).toBe(true);
    expect(res.origin).toBe('الفيوم');
    expect(res.destination).toBe('ميدان الجيزة');
  });

  it('parses question style queries (ازاي اروح ... من ...)', () => {
    const res = parseEgyptianTransitQuery('ازاي اروح التحرير من رمسيس؟');
    expect(res.is_natural_query).toBe(true);
    expect(res.origin).toBe('رمسيس');
    expect(res.destination).toBe('التحرير');
  });

  it('parses shorthand origin-to-destination (فيصل للجيزة)', () => {
    const res = parseEgyptianTransitQuery('فيصل للجيزة');
    expect(res.is_natural_query).toBe(true);
    expect(res.origin).toBe('فيصل');
    expect(res.destination).toBe('الجيزة');
  });

  it('detects preference to avoid metro', () => {
    const res = parseEgyptianTransitQuery('أنا في فيصل وعايز أروح جامعة القاهرة من غير مترو');
    expect(res.origin).toBe('فيصل');
    expect(res.destination).toBe('جامعة القاهرة');
    expect(res.preferences.avoid_modes).toContain('metro');
  });

  it('detects cheapest and least walking preferences', () => {
    const res = parseEgyptianTransitQuery('عايز أرخص طريق ومش عايز أمشي كتير');
    expect(res.preferences.ranking).toBe('cheapest');
    expect(res.preferences.least_walking).toBe(true);
  });

  it('detects luggage preference', () => {
    const res = parseEgyptianTransitQuery('معايا شنط أركب إيه من رمسيس للمطار؟');
    expect(res.preferences.luggage).toBe(true);
    expect(res.origin).toBe('رمسيس');
    expect(res.destination).toBe('المطار');
  });

  it('detects nearest metro station intent', () => {
    const res = parseEgyptianTransitQuery('أقرب محطة مترو من مكاني');
    expect(res.intent).toBe('nearest_metro');
    expect(res.is_natural_query).toBe(true);
  });

  it('parses English transit queries', () => {
    const res = parseEgyptianTransitQuery('Faisal to Cairo University');
    expect(res.is_natural_query).toBe(true);
    expect(res.origin).toBe('Faisal');
    expect(res.destination).toBe('Cairo University');
  });

  it('parses Arabizi (Franco-Arabic) transit queries', () => {
    const res = parseEgyptianTransitQuery('ana fe faisal w 3ayez aro7 cairo university');
    expect(res.is_natural_query).toBe(true);
    expect(res.origin).toBe('faisal');
    expect(res.destination).toBe('cairo university');
  });
});
