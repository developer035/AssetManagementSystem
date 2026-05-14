import { create } from 'zustand';

export const useDetectionStore = create((set, get) => ({
  // ─── Core State ──────────────────────────────────────
  uploadedImage: null,
  imageUrl: null,
  isLoading: false,
  error: null,
  detectionResult: null,
  selectedCategories: null,   // null = show all
  confidenceThreshold: 0.35,
  jobId: null,
  activeTab: 'overview',      // overview | review | map | controls | heights | exports | report | digit
  activeView: 'detect',       // 'detect' | 'change' | 'live'

  // ─── Change Detection State ──────────────────────────
  changeResult: null,
  changeLoading: false,
  changeError: null,

  // ─── Height Estimation State ─────────────────────────
  heightResult: null,
  heightLoading: false,

  // ─── DIGIT Integration State ─────────────────────────
  digitResult: null,
  digitLoading: false,
  digitStats: null,

  // ─── Actions ────────────────────────────────────────
  setUploadedImage: (file) => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);

    set({
      uploadedImage: file,
      imageUrl: URL.createObjectURL(file),
      detectionResult: null,
      error: null,
      jobId: null,
      selectedCategories: null,
      confidenceThreshold: 0.35,
      activeTab: 'overview',
      heightResult: null,
      heightLoading: false,
      digitResult: null,
      digitLoading: false,
    });
  },

  setLoading: (val) => set({ isLoading: val }),
  setError: (err) => set({ error: err, isLoading: false }),

  setDetectionResult: (result) => set({
    detectionResult: result,
    jobId: result.job_id,
    isLoading: false,
    error: null,
    activeTab: 'overview',
  }),

  setConfidenceThreshold: (val) => set({ confidenceThreshold: val }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveView: (view) => set({ activeView: view }),

  // Change Detection
  setChangeLoading: (val) => set({ changeLoading: val }),
  setChangeError: (err) => set({ changeError: err, changeLoading: false }),
  setChangeResult: (result) => set({ changeResult: result, changeLoading: false, changeError: null }),

  // Height Estimation
  setHeightLoading: (val) => set({ heightLoading: val }),
  setHeightResult: (result) => set({ heightResult: result, heightLoading: false }),

  // DIGIT
  setDigitLoading: (val) => set({ digitLoading: val }),
  setDigitResult: (result) => set({ digitResult: result, digitLoading: false }),
  setDigitStats: (stats) => set({ digitStats: stats }),

  toggleCategory: (category) => set((state) => {
    const allCats = [...new Set(
      state.detectionResult?.detections?.map(d => d.category) || []
    )];
    const current = state.selectedCategories || allCats;
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    return { selectedCategories: updated };
  }),

  selectAllCategories: () => set({ selectedCategories: null }),

  resetAll: () => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({
      uploadedImage: null,
      imageUrl: null,
      isLoading: false,
      error: null,
      detectionResult: null,
      selectedCategories: null,
      confidenceThreshold: 0.35,
      jobId: null,
      activeTab: 'overview',
      activeView: 'detect',
      changeResult: null,
      changeLoading: false,
      changeError: null,
      heightResult: null,
      heightLoading: false,
      digitResult: null,
      digitLoading: false,
    });
  },

  // ─── Derived getters ───────────────────────────────
  getFilteredDetections: () => {
    const state = get();
    if (!state.detectionResult?.detections) return [];
    return state.detectionResult.detections.filter(det => {
      if (det.confidence < state.confidenceThreshold) return false;
      if (state.selectedCategories && !state.selectedCategories.includes(det.category)) return false;
      return true;
    });
  },
}));
