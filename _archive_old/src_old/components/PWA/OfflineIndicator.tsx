import WifiIcon from "@mui/icons-material/Wifi"
import WifiOffIcon from "@mui/icons-material/WifiOff"
import { Alert, Snackbar } from "@mui/material"
import React, { useState, useEffect } from "react"

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineAlert(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineAlert(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <>
      <Snackbar open={showOfflineAlert} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity="warning" icon={<WifiOffIcon />}>
          You are offline. Some features may be limited.
        </Alert>
      </Snackbar>

      <Snackbar
        open={!isOnline && !showOfflineAlert}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={3000}
        onClose={() => setShowOfflineAlert(false)}
      >
        <Alert severity="success" icon={<WifiIcon />}>
          Back online!
        </Alert>
      </Snackbar>
    </>
  )
}

export default OfflineIndicator
