/**
 * NLP Studio — Unit Tests for State Store
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from '../../src/core/store.js';

// Mock localStorage for test environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

// In jsdom environment, localStorage may already exist; we override it
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('Reactive Store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('sets and gets state', () => {
    const store = createStore();
    store.setState('app.loading', true);
    expect(store.getState('app.loading')).toBe(true);
  });

  it('gets nested state', () => {
    const store = createStore({ a: { b: { c: 42 } } });
    expect(store.getState('a.b.c')).toBe(42);
  });

  it('returns full state clone', () => {
    const store = createStore({ x: 1 });
    const state = store.getState();
    state.x = 999;
    expect(store.getState('x')).toBe(1); // Immutable
  });

  it('notifies subscribers on state change', () => {
    const store = createStore();
    const spy = vi.fn();
    store.subscribe('app.loading', spy);
    store.setState('app.loading', true);
    expect(spy).toHaveBeenCalled();
  });

  it('unsubscribes correctly', () => {
    const store = createStore();
    const spy = vi.fn();
    const unsub = store.subscribe('app.loading', spy);
    unsub();
    store.setState('app.loading', true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('notifies parent path subscribers', () => {
    const store = createStore({ a: { b: 1 } });
    const spy = vi.fn();
    store.subscribe('a', spy);
    store.setState('a.b', 2);
    expect(spy).toHaveBeenCalled();
  });

  it('resets to initial state', () => {
    const initial = { x: 1, y: 2 };
    const store = createStore(initial);
    store.setState('x', 100);
    store.reset();
    expect(store.getState('x')).toBe(1);
  });

  it('runs middleware on state change', () => {
    const store = createStore();
    const spy = vi.fn();
    store.use(spy);
    store.setState('app.loading', true);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      path: 'app.loading',
      value: true
    }));
  });

  it('does not leak subscribers between store instances', () => {
    const store1 = createStore({ x: 0 });
    const store2 = createStore({ x: 0 });
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    store1.subscribe('x', spy1);
    store2.subscribe('x', spy2);

    store1.setState('x', 1);
    expect(spy1).toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  it('persists settings to localStorage', () => {
    const store = createStore();
    store.setState('settings.logLevel', 'debug');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('persists history to localStorage', () => {
    const store = createStore();
    store.setState('history', [{ type: 'test' }]);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('handles wildcard subscribers', () => {
    const store = createStore({ a: 1, b: 2 });
    const spy = vi.fn();
    store.subscribe('*', spy);
    store.setState('a', 10);
    expect(spy).toHaveBeenCalled();
  });

  it('creates nested paths that do not exist', () => {
    const store = createStore({});
    store.setState('a.b.c', 'deep');
    expect(store.getState('a.b.c')).toBe('deep');
  });

  it('returns undefined for non-existent paths', () => {
    const store = createStore({ x: 1 });
    expect(store.getState('y.z')).toBeUndefined();
  });

  it('handles array state correctly', () => {
    const store = createStore({ items: [] });
    store.setState('items', [1, 2, 3]);
    expect(store.getState('items')).toEqual([1, 2, 3]);
  });
});
