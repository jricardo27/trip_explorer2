import { AccountCircle, Login, Logout, Sync, Menu as MenuIcon } from "@mui/icons-material"
import {
  AppBar,
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  Fade,
  ListItemIcon,
} from "@mui/material"
import React, { useContext, useState } from "react"
import { FaDownload, FaUpload } from "react-icons/fa"
import { MdHelpOutline, MdLocationOn, MdAssessment } from "react-icons/md"
import { useNavigate, Link } from "react-router-dom"

import SavedFeaturesContext from "../../contexts/SavedFeaturesContext"
import { useTripContext } from "../../contexts/TripContext"
import { AuthModal } from "../Auth/AuthModal"
import { GuestSyncModal } from "../Auth/GuestSyncModal"
import { TravelReportModal } from "../Reports/TravelReportModal"
import WelcomeModal from "../WelcomeModal/WelcomeModal"

import { exportTripToGeoJSON, exportTripToKML } from "./exportTrip"
import { exportTripToExcel } from "./exportTripToExcel"
import { exportTripToPDF } from "./exportTripToPDF"
import { importBackup } from "./importBackup"
import { importTrip } from "./importTrip"
import { saveAsBackup } from "./saveAsBackup"
import { saveAsGeoJson } from "./saveAsGeoJson"
import { saveAsKml } from "./saveAsKml"

interface TopMenuProps {
  onMenuClick: () => void
}

const destinations = [
  {
    label: "Australia",
    children: [
      { path: "/australianCapitalTerritory", label: "Australian Capital Territory" },
      { path: "/newSouthWales", label: "New South Wales" },
      { path: "/northernTerritory", label: "Northern Territory" },
      { path: "/queensland", label: "Queensland" },
      { path: "/victoria", label: "Victoria" },
      { path: "/southAustralia", label: "South Australia" },
      { path: "/tasmania", label: "Tasmania" },
      { path: "/westernAustralia", label: "Western Australia" },
    ],
  },
  {
    label: "New Zealand",
    children: [{ path: "/newZealand", label: "New Zealand" }],
  },
]

const TopMenu: React.FC<TopMenuProps> = ({ onMenuClick }: TopMenuProps) => {
  const location = window.location.pathname
  const { savedFeatures, setSavedFeatures, userId, setUserId, email, logout } = useContext(SavedFeaturesContext)!
  const { createTrip, addLocationToDay, addFeatureToDay, currentTrip, dayLocations, dayFeatures } = useTripContext()
  const navigate = useNavigate()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(null)
  const [openWelcomeModal, setOpenWelcomeModal] = useState<boolean>(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [guestSyncOpen, setGuestSyncOpen] = useState(false)
  const [importAnchorEl, setImportAnchorEl] = useState<null | HTMLElement>(null)
  const [destinationAnchorEl, setDestinationAnchorEl] = useState<null | HTMLElement>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false) // Added
  const [exportMenuIsOpen, setExportMenuIsOpen] = useState(false) // Changed from Boolean(anchorEl)
  const importMenuIsOpen = Boolean(importAnchorEl)
  const destinationMenuIsOpen = Boolean(destinationAnchorEl)

  const openExportMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    setExportMenuIsOpen(true) // Added
  }

  const closeExportMenu = () => {
    setAnchorEl(null)
    setExportMenuIsOpen(false) // Added
  }

  const openImportMenu = (event: React.MouseEvent<HTMLElement>) => {
    setImportAnchorEl(event.currentTarget)
  }

  const closeImportMenu = () => {
    setImportAnchorEl(null)
  }

  const openDestinationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setDestinationAnchorEl(event.currentTarget)
  }

  const closeDestinationMenu = () => {
    setDestinationAnchorEl(null)
  }

  const closeMenuAfterAction = (handler: (event: React.MouseEvent) => void) => {
    return (event: React.MouseEvent) => {
      handler(event)
      closeExportMenu()
      closeImportMenu()
    }
  }

  const handleOpenWelcomeModal = () => setOpenWelcomeModal(true)
  const handleCloseWelcomeModal = () => setOpenWelcomeModal(false)

  const handleDestinationChange = (_event: React.MouseEvent<HTMLElement>, newDestination: string) => {
    localStorage.removeItem("mapState")
    navigate(newDestination)
    closeDestinationMenu()
  }

  // Added for the new menu item structure
  const handleImport = () => {
    importTrip(createTrip, addLocationToDay, addFeatureToDay)
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          {/* Left: Title and Back Link */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Tooltip title="Go back to destination selection" aria-label="Go back to destination selection">
              <Link to="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center" }}>
                <Typography variant="h6" component="div" sx={{ whiteSpace: "nowrap" }}>
                  Trip Explorer
                </Typography>
              </Link>
            </Tooltip>
          </Box>

          {/* Right: Actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Saved Features" aria-label="Saved Features">
              <Button onClick={onMenuClick} color="inherit" sx={{ minWidth: "auto", p: 1 }}>
                <MenuIcon />
              </Button>
            </Tooltip>

            <Tooltip title="Travel Report" aria-label="Travel Report">
              <Button onClick={() => setReportModalOpen(true)} color="inherit" sx={{ minWidth: "auto", p: 1 }}>
                <MdAssessment size={24} />
              </Button>
            </Tooltip>

            <Tooltip title="Export" aria-label="Export">
              <Button
                id="fade-button"
                aria-controls={exportMenuIsOpen ? "fade-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={exportMenuIsOpen ? "true" : undefined}
                onClick={openExportMenu}
                color="inherit"
                sx={{ minWidth: "auto", p: 1 }}
              >
                <FaDownload size={20} />
              </Button>
            </Tooltip>
            {/* Export Menu */}
            <Menu
              id="fade-menu"
              MenuListProps={{
                "aria-labelledby": "fade-button",
              }}
              anchorEl={anchorEl}
              open={exportMenuIsOpen}
              onClose={closeExportMenu}
              TransitionComponent={Fade}
            >
              <MenuItem onClick={closeMenuAfterAction(() => saveAsGeoJson(savedFeatures))}>To GeoJson</MenuItem>
              <MenuItem onClick={closeMenuAfterAction(() => saveAsKml(savedFeatures))}>To KML</MenuItem>
              <MenuItem onClick={closeMenuAfterAction(() => saveAsBackup(savedFeatures))}>Export backup</MenuItem>
              {currentTrip && [
                <MenuItem key="divider" divider />,
                <MenuItem
                  key="geojson"
                  onClick={closeMenuAfterAction(() =>
                    exportTripToGeoJSON({ trip: currentTrip, locations: dayLocations, features: dayFeatures }),
                  )}
                >
                  Export Trip (GeoJSON)
                </MenuItem>,
                <MenuItem
                  key="kml"
                  onClick={closeMenuAfterAction(() =>
                    exportTripToKML({ trip: currentTrip, locations: dayLocations, features: dayFeatures }),
                  )}
                >
                  Export Trip (KML)
                </MenuItem>,
                <MenuItem
                  key="excel"
                  onClick={closeMenuAfterAction(() =>
                    exportTripToExcel({ trip: currentTrip, locations: dayLocations, features: dayFeatures }),
                  )}
                >
                  Export Trip (Excel)
                </MenuItem>,
                <MenuItem
                  key="pdf"
                  onClick={closeMenuAfterAction(() => exportTripToPDF(currentTrip, dayLocations, dayFeatures))}
                >
                  Export Trip (PDF)
                </MenuItem>,
              ]}
              <MenuItem onClick={closeMenuAfterAction(handleImport)}>
                <ListItemIcon>
                  <FaUpload fontSize="small" />
                </ListItemIcon>
                Import Trip (GeoJSON/KML)
              </MenuItem>
            </Menu>
            <TravelReportModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} />

            <Tooltip title="Import" aria-label="Import">
              <Button
                id="import-button"
                aria-controls={importMenuIsOpen ? "import-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={importMenuIsOpen ? "true" : undefined}
                onClick={openImportMenu}
                color="inherit"
                sx={{ minWidth: "auto", p: 1 }}
              >
                <FaUpload size={20} />
              </Button>
            </Tooltip>
            {/* Import Menu */}
            <Menu id="import-menu" anchorEl={importAnchorEl} open={importMenuIsOpen} onClose={closeImportMenu}>
              <MenuItem
                onClick={closeMenuAfterAction(() => {
                  importTrip(createTrip, addLocationToDay, addFeatureToDay)
                })}
              >
                Import Trip
              </MenuItem>
              <MenuItem
                onClick={closeMenuAfterAction(() => {
                  importBackup("override", setSavedFeatures)
                })}
              >
                Override existing POIs
              </MenuItem>
              <MenuItem
                onClick={closeMenuAfterAction(() => {
                  importBackup("append", setSavedFeatures)
                })}
              >
                Append categories
              </MenuItem>
              <MenuItem
                onClick={closeMenuAfterAction(() => {
                  importBackup("merge", setSavedFeatures)
                })}
              >
                Merge Categories
              </MenuItem>
            </Menu>

            <Tooltip title="Destinations" aria-label="Destinations">
              <Button
                id="destination-button"
                aria-controls={destinationMenuIsOpen ? "destination-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={destinationMenuIsOpen ? "true" : undefined}
                onClick={openDestinationMenu}
                color="inherit"
                sx={{ minWidth: "auto", p: 1 }}
              >
                <MdLocationOn size={24} />
              </Button>
            </Tooltip>
            {/* Destination Menu */}
            <Menu
              id="destination-menu"
              anchorEl={destinationAnchorEl}
              open={destinationMenuIsOpen}
              onClose={closeDestinationMenu}
            >
              {destinations.map((region) => (
                <Box key={region.label}>
                  <MenuItem disabled>{region.label}</MenuItem>
                  <List disablePadding>
                    {region.children.map((dest) => (
                      <ListItem key={dest.path} disablePadding>
                        <ListItemButton
                          onClick={(event) => handleDestinationChange(event, dest.path)}
                          sx={{
                            pl: 4,
                            bgcolor:
                              location === dest.path
                                ? (theme) => alpha(theme.palette.primary.main, 0.2)
                                : "transparent",
                          }}
                        >
                          <ListItemText primary={dest.label} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Menu>

            <Tooltip title="Help" aria-label="Help">
              <Button onClick={handleOpenWelcomeModal} color="inherit" sx={{ minWidth: "auto", p: 1 }}>
                <MdHelpOutline size={24} />
              </Button>
            </Tooltip>
            <WelcomeModal open={openWelcomeModal} onClose={handleCloseWelcomeModal} />

            {/* Account Menu */}
            <Tooltip title="Account" aria-label="Account">
              <Button
                onClick={(e) => setAccountAnchorEl(e.currentTarget)}
                color="inherit"
                startIcon={<AccountCircle />}
                sx={{ textTransform: "none" }}
              >
                {email ? email.split("@")[0] : "Guest"}
              </Button>
            </Tooltip>
            <Menu anchorEl={accountAnchorEl} open={Boolean(accountAnchorEl)} onClose={() => setAccountAnchorEl(null)}>
              {email
                ? [
                    <MenuItem key="email" disabled>
                      <Typography variant="body2">{email}</Typography>
                    </MenuItem>,
                    <MenuItem
                      key="logout"
                      onClick={() => {
                        logout()
                        setAccountAnchorEl(null)
                      }}
                    >
                      <ListItemIcon>
                        <Logout fontSize="small" />
                      </ListItemIcon>
                      Logout
                    </MenuItem>,
                  ]
                : [
                    <MenuItem
                      key="login"
                      onClick={() => {
                        setIsAuthModalOpen(true)
                        setAccountAnchorEl(null)
                      }}
                    >
                      <ListItemIcon>
                        <Login fontSize="small" />
                      </ListItemIcon>
                      Login / Sign Up
                    </MenuItem>,
                    <MenuItem
                      key="guest-sync"
                      onClick={() => {
                        setGuestSyncOpen(true)
                        setAccountAnchorEl(null)
                      }}
                    >
                      <ListItemIcon>
                        <Sync fontSize="small" />
                      </ListItemIcon>
                      Guest Sync
                    </MenuItem>,
                  ]}
            </Menu>
            <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            <GuestSyncModal
              open={guestSyncOpen}
              onClose={() => setGuestSyncOpen(false)}
              userId={userId}
              setUserId={setUserId}
            />
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  )
}

export default TopMenu
