interface Config {
  ga: {
    measurementId: string
  }
  issue_manager_url: string
}

declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      GA_MEASUREMENT_ID?: string
    }
  }
}

const config: Config = {
  ga: {
    measurementId: window.RUNTIME_CONFIG?.GA_MEASUREMENT_ID || import.meta.env.VITE_GA_MEASUREMENT_ID || "",
  },
  issue_manager_url: "https://github.com/jricardo27/online_trip_explorer/issues",
}

if (!config.ga.measurementId) {
  console.warn("Google Analytics Measurement ID is not defined")
}

export default config
