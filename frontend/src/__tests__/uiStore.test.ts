import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../store/useUIStore';

describe('Centralized UI Store (useUIStore)', () => {
  beforeEach(() => {
    // Reset all modals and drawers before each test
    useUIStore.getState().closeAllOverlays();
  });

  it('initializes with all overlays closed', () => {
    const state = useUIStore.getState();
    expect(state.modals.stationSelector.state).toBe('closed');
    expect(state.modals.filters.state).toBe('closed');
    expect(state.modals.journeyDetails.state).toBe('closed');
    expect(state.drawers.chat.state).toBe('closed');
    expect(state.drawers.notifications.state).toBe('closed');
    expect(state.overlayStack).toEqual([]);
  });

  it('opens and closes a modal via openModal and closeModal', () => {
    useUIStore.getState().openModal('stationSelector', { target: 'from', initialQuery: 'فيصل' });
    let state = useUIStore.getState();
    expect(state.modals.stationSelector.state).toBe('open');
    expect(state.modals.stationSelector.payload?.target).toBe('from');
    expect(state.modals.stationSelector.payload?.initialQuery).toBe('فيصل');
    expect(state.overlayStack).toContain('modal:stationSelector');

    useUIStore.getState().closeModal('stationSelector');
    state = useUIStore.getState();
    expect(state.modals.stationSelector.state).toBe('closed');
    expect(state.overlayStack).not.toContain('modal:stationSelector');
  });

  it('manages overlay stack in LIFO order and closeTopOverlay closes the topmost overlay', () => {
    useUIStore.getState().openDrawer('chat');
    useUIStore.getState().openModal('stationSelector', { target: 'to' });

    let state = useUIStore.getState();
    expect(state.overlayStack).toEqual(['drawer:chat', 'modal:stationSelector']);

    // Close top overlay (should close stationSelector modal)
    const closed = useUIStore.getState().closeTopOverlay();
    expect(closed).toBe(true);

    state = useUIStore.getState();
    expect(state.modals.stationSelector.state).toBe('closed');
    expect(state.drawers.chat.state).toBe('open');
    expect(state.overlayStack).toEqual(['drawer:chat']);

    // Close next top overlay (should close chat drawer)
    const closedNext = useUIStore.getState().closeTopOverlay();
    expect(closedNext).toBe(true);

    state = useUIStore.getState();
    expect(state.drawers.chat.state).toBe('closed');
    expect(state.overlayStack).toEqual([]);

    // When stack is empty, closeTopOverlay returns false
    expect(useUIStore.getState().closeTopOverlay()).toBe(false);
  });

  it('manages bottom sheet snap points', () => {
    expect(useUIStore.getState().bottomSheet.snapPoint).toBe('collapsed');

    useUIStore.getState().setBottomSheetSnap('half');
    expect(useUIStore.getState().bottomSheet.snapPoint).toBe('half');

    useUIStore.getState().setBottomSheetSnap('expanded');
    expect(useUIStore.getState().bottomSheet.snapPoint).toBe('expanded');
  });

  it('manages search bar query, focus, and state transitions', () => {
    useUIStore.getState().setSearchQuery('جامعة القاهرة');
    expect(useUIStore.getState().searchBar.query).toBe('جامعة القاهرة');

    useUIStore.getState().setSearchBarFocused(true);
    expect(useUIStore.getState().searchBar.isFocused).toBe(true);

    useUIStore.getState().setSearchBarState('loading');
    expect(useUIStore.getState().searchBar.state).toBe('loading');

    useUIStore.getState().setSearchBarState('success');
    expect(useUIStore.getState().searchBar.state).toBe('success');
  });
});
