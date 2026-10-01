import { create } from 'zustand';

export type UIState =
  | 'closed'
  | 'opening'
  | 'open'
  | 'closing'
  | 'loading'
  | 'success'
  | 'error'
  | 'empty';

export type ModalKey =
  | 'stationSelector'
  | 'filters'
  | 'journeyDetails'
  | 'routeDetails'
  | 'saveTrip'
  | 'feedback';

export type DrawerKey =
  | 'chat'
  | 'notifications'
  | 'mobileNav'
  | 'profile';

export type BottomSheetSnap = 'collapsed' | 'half' | 'expanded';

export interface StationSelectorPayload {
  target: 'from' | 'to';
  initialQuery?: string;
  onSelect?: (selection: { name: string; lat?: number; lng?: number; stopId?: number | string }) => void;
}

export interface JourneyDetailsPayload {
  journeyId?: string | number;
  journeyData?: any;
}

export interface RouteDetailsPayload {
  lineCode: string;
}

export interface FilterOptions {
  ranking: 'fastest' | 'cheapest' | 'least_walking' | 'least_transfers' | 'balanced';
  avoidModes: string[];
  maxWalkMeters: number;
}

export interface UIStoreState {
  // Modal states
  modals: {
    stationSelector: { state: UIState; payload?: StationSelectorPayload };
    filters: { state: UIState; payload?: FilterOptions };
    journeyDetails: { state: UIState; payload?: JourneyDetailsPayload };
    routeDetails: { state: UIState; payload?: RouteDetailsPayload };
    saveTrip: { state: UIState; payload?: any };
    feedback: { state: UIState; payload?: any };
  };

  // Drawer states
  drawers: {
    chat: { state: UIState; payload?: any };
    notifications: { state: UIState; payload?: any };
    mobileNav: { state: UIState; payload?: any };
    profile: { state: UIState; payload?: any };
  };

  // Bottom Sheet State
  bottomSheet: {
    state: UIState;
    snapPoint: BottomSheetSnap;
    contentKey?: string;
  };

  // Search input state
  searchBar: {
    state: UIState;
    isFocused: boolean;
    query: string;
  };

  // Central overlay stack for LIFO escape & backdrop management
  overlayStack: string[];

  // Actions
  openModal: <K extends ModalKey>(key: K, payload?: UIStoreState['modals'][K]['payload']) => void;
  closeModal: (key: ModalKey) => void;
  setModalState: (key: ModalKey, state: UIState) => void;

  openDrawer: <K extends DrawerKey>(key: K, payload?: UIStoreState['drawers'][K]['payload']) => void;
  closeDrawer: (key: DrawerKey) => void;
  setDrawerState: (key: DrawerKey, state: UIState) => void;

  setBottomSheetSnap: (snap: BottomSheetSnap) => void;
  setBottomSheetState: (state: UIState) => void;

  setSearchQuery: (query: string) => void;
  setSearchBarFocused: (focused: boolean) => void;
  setSearchBarState: (state: UIState) => void;

  closeTopOverlay: () => boolean;
  closeAllOverlays: () => void;
}

export const useUIStore = create<UIStoreState>((set, get) => ({
  modals: {
    stationSelector: { state: 'closed' },
    filters: { state: 'closed' },
    journeyDetails: { state: 'closed' },
    routeDetails: { state: 'closed' },
    saveTrip: { state: 'closed' },
    feedback: { state: 'closed' },
  },

  drawers: {
    chat: { state: 'closed' },
    notifications: { state: 'closed' },
    mobileNav: { state: 'closed' },
    profile: { state: 'closed' },
  },

  bottomSheet: {
    state: 'closed',
    snapPoint: 'collapsed',
  },

  searchBar: {
    state: 'closed',
    isFocused: false,
    query: '',
  },

  overlayStack: [],

  openModal: (key, payload) => {
    const overlayId = `modal:${key}`;
    set((state) => ({
      modals: {
        ...state.modals,
        [key]: { state: 'open', payload },
      },
      overlayStack: state.overlayStack.includes(overlayId)
        ? state.overlayStack
        : [...state.overlayStack, overlayId],
    }));
  },

  closeModal: (key) => {
    const overlayId = `modal:${key}`;
    set((state) => ({
      modals: {
        ...state.modals,
        [key]: { state: 'closed', payload: undefined },
      },
      overlayStack: state.overlayStack.filter((id) => id !== overlayId),
    }));
  },

  setModalState: (key, uiState) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [key]: { ...state.modals[key], state: uiState },
      },
    }));
  },

  openDrawer: (key, payload) => {
    const overlayId = `drawer:${key}`;
    set((state) => ({
      drawers: {
        ...state.drawers,
        [key]: { state: 'open', payload },
      },
      overlayStack: state.overlayStack.includes(overlayId)
        ? state.overlayStack
        : [...state.overlayStack, overlayId],
    }));
  },

  closeDrawer: (key) => {
    const overlayId = `drawer:${key}`;
    set((state) => ({
      drawers: {
        ...state.drawers,
        [key]: { state: 'closed', payload: undefined },
      },
      overlayStack: state.overlayStack.filter((id) => id !== overlayId),
    }));
  },

  setDrawerState: (key, uiState) => {
    set((state) => ({
      drawers: {
        ...state.drawers,
        [key]: { ...state.drawers[key], state: uiState },
      },
    }));
  },

  setBottomSheetSnap: (snapPoint) => {
    set((state) => ({
      bottomSheet: {
        ...state.bottomSheet,
        snapPoint,
        state: snapPoint === 'collapsed' ? 'closed' : 'open',
      },
    }));
  },

  setBottomSheetState: (uiState) => {
    set((state) => ({
      bottomSheet: {
        ...state.bottomSheet,
        state: uiState,
      },
    }));
  },

  setSearchQuery: (query) => {
    set((state) => ({
      searchBar: {
        ...state.searchBar,
        query,
      },
    }));
  },

  setSearchBarFocused: (isFocused) => {
    set((state) => ({
      searchBar: {
        ...state.searchBar,
        isFocused,
      },
    }));
  },

  setSearchBarState: (uiState) => {
    set((state) => ({
      searchBar: {
        ...state.searchBar,
        state: uiState,
      },
    }));
  },

  closeTopOverlay: () => {
    const { overlayStack, closeModal, closeDrawer } = get();
    if (overlayStack.length === 0) return false;

    const topId = overlayStack[overlayStack.length - 1];
    if (topId.startsWith('modal:')) {
      const modalKey = topId.replace('modal:', '') as ModalKey;
      closeModal(modalKey);
      return true;
    }
    if (topId.startsWith('drawer:')) {
      const drawerKey = topId.replace('drawer:', '') as DrawerKey;
      closeDrawer(drawerKey);
      return true;
    }

    set({ overlayStack: overlayStack.slice(0, -1) });
    return true;
  },

  closeAllOverlays: () => {
    set({
      modals: {
        stationSelector: { state: 'closed' },
        filters: { state: 'closed' },
        journeyDetails: { state: 'closed' },
        routeDetails: { state: 'closed' },
        saveTrip: { state: 'closed' },
        feedback: { state: 'closed' },
      },
      drawers: {
        chat: { state: 'closed' },
        notifications: { state: 'closed' },
        mobileNav: { state: 'closed' },
        profile: { state: 'closed' },
      },
      overlayStack: [],
    });
  },
}));
