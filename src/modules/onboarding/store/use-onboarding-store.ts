import { create } from 'zustand'

interface OnboardingState {
  centroOrientacionTourRequested: number
  requestCentroOrientacionTour: () => void
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  centroOrientacionTourRequested: 0,
  requestCentroOrientacionTour: () =>
    set((state) => ({
      centroOrientacionTourRequested: state.centroOrientacionTourRequested + 1,
    })),
}))
