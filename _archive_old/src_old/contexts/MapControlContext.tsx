import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"

interface MapControlContextType {
  flyTo: (lat: number, lng: number) => void
  registerFlyTo: (fn: (lat: number, lng: number) => void) => void
  unregisterFlyTo: () => void
}

const MapControlContext = createContext<MapControlContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useMapControl = () => {
  const context = useContext(MapControlContext)
  if (!context) {
    throw new Error("useMapControl must be used within a MapControlProvider")
  }
  return context
}

export const MapControlProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [flyToFn, setFlyToFn] = useState<((lat: number, lng: number) => void) | null>(null)

  const registerFlyTo = useCallback((fn: (lat: number, lng: number) => void) => {
    setFlyToFn(() => fn)
  }, [])

  const unregisterFlyTo = useCallback(() => {
    setFlyToFn(null)
  }, [])

  const flyTo = useCallback(
    (lat: number, lng: number) => {
      if (flyToFn) {
        flyToFn(lat, lng)
      } else {
        console.warn("Map flyTo function not registered (map might not be loaded)")
      }
    },
    [flyToFn],
  )

  return (
    <MapControlContext.Provider value={{ flyTo, registerFlyTo, unregisterFlyTo }}>
      {children}
    </MapControlContext.Provider>
  )
}
