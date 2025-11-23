import {
  Drawer,
  Box,
  TextField,
  useTheme,
  useMediaQuery,
  Typography,
  Button,
} from "@mui/material"
import React, { useState, useContext, useCallback, useEffect, useMemo } from "react"
import { MdContentCopy } from "react-icons/md"

import SavedFeaturesContext, { DEFAULT_CATEGORY } from "../../contexts/SavedFeaturesContext"
import { AuthModal } from "../Auth/AuthModal"

import { CategoryContextMenu } from "./ContextMenu/CategoryContextMenu"
import { FeatureContextMenu } from "./ContextMenu/FeatureContextMenu"
import { FeatureDragContext } from "./FeatureList/FeatureDragContext"
import { FeatureList } from "./FeatureList/FeatureList"
import { filterFeatures } from "./filterFeatures"
import { useCategoryManagement } from "./hooks/useCategoryManagement"
import { useContextMenu } from "./hooks/useContextMenu"
import { useFeatureManagement } from "./hooks/useFeatureManagement"
import { useFeatureSelection } from "./hooks/useFeatureSelection"
import { TabList } from "./TabList/TabList"

interface SavedFeaturesDrawerProps {
  drawerOpen: boolean
  onClose: () => void
  setCurrentCategory?: (newState: string) => void
}

const excludedProperties = ["id", "images", "style"] as const

const SavedFeaturesDrawer: React.FC<SavedFeaturesDrawerProps> = ({ drawerOpen, onClose, setCurrentCategory }) => {
  const [selectedTab, setSelectedTab] = useState<string>(DEFAULT_CATEGORY)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [inputUserId, setInputUserId] = useState<string>("")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const { savedFeatures, setSavedFeatures, removeFeature, userId, setUserId, email, logout } = useContext(SavedFeaturesContext)!
  const { selectedFeature, setSelectedFeature } = useFeatureSelection()
  const { contextMenu, contextMenuTab, contextMenuFeature, handleContextMenu, handleTabContextMenu, handleClose } = useContextMenu()
  const { moveCategory, handleRenameCategory, handleAddCategory, handleRemoveCategory } = useCategoryManagement(
    setSavedFeatures, setSelectedTab, savedFeatures, contextMenuTab)
  const { handleDuplicate, handleRemoveFromList, handleRemoveCompletely } = useFeatureManagement(
    setSavedFeatures, selectedTab, contextMenuFeature, removeFeature)

  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down("sm"))
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"))
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"))

  const drawerWidth = isMd ? "70%" : isSm ? "50%" : isXs ? "92%" : "50%"

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue)
    setSelectedFeature(null)
  }, [setSelectedFeature])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  useEffect(() => {
    if (setCurrentCategory) {
      setCurrentCategory(selectedTab)
    }
  }, [selectedTab, setCurrentCategory])

  const itemsWithOriginalIndex = useMemo(() => {
    return (savedFeatures[selectedTab] || []).map((feature, index) => ({
      feature,
      originalIndex: index,
    }))
  }, [savedFeatures, selectedTab])

  const filteredItems = useMemo(() => {
    return filterFeatures(itemsWithOriginalIndex, searchQuery)
  }, [itemsWithOriginalIndex, searchQuery])

  return (
    <>
      <FeatureDragContext savedFeatures={savedFeatures} selectedTab={selectedTab} setSavedFeatures={setSavedFeatures}>
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={onClose}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              marginTop: "64px",
              height: "calc(100% - 64px)",
              boxSizing: "border-box",
            },
          }}
        >
          <Box sx={{ display: "flex", height: "100%" }}>
            <Box sx={{ width: 150, bgcolor: "background.paper", borderRight: 1, borderColor: "divider" }}>
              <TabList
                tabs={Object.keys(savedFeatures)}
                selectedTab={selectedTab}
                handleTabChange={handleTabChange}
                handleTabContextMenu={handleTabContextMenu}
              />
            </Box>
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", height: "100%" }}>
              <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
                <TextField
                  fullWidth
                  label="Search Features"
                  variant="outlined"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  sx={{ mb: 2 }}
                />
                <FeatureList
                  items={filteredItems}
                  setSavedFeatures={setSavedFeatures}
                  selectedTab={selectedTab}
                  selectedFeature={selectedFeature}
                  setSelectedFeature={setSelectedFeature}
                  handleContextMenu={handleContextMenu}
                  excludedProperties={Array.from(excludedProperties)}
                />
              </Box>
              <Box sx={{ p: 2, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
                {email ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">Logged in as:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>{email}</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => {
                        // Confirm logout?
                        if (window.confirm("Are you sure you want to logout?")) {
                          logout()
                        }
                      }}
                    >
                      Logout
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => setIsAuthModalOpen(true)}
                      >
                        Login / Sign Up
                      </Button>
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>Guest Sync</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "action.hover", p: 0.5, borderRadius: 1 }}>
                        {userId}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<MdContentCopy />}
                        onClick={() => {
                          navigator.clipboard.writeText(userId)
                        }}
                      >
                        Copy
                      </Button>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        size="small"
                        label="Enter ID to Sync"
                        value={inputUserId}
                        onChange={(e) => setInputUserId(e.target.value)}
                        fullWidth
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          if (inputUserId) {
                            setUserId(inputUserId)
                            setInputUserId("")
                          }
                        }}
                      >
                        Sync
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Drawer>
        <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <CategoryContextMenu
          contextMenu={contextMenu}
          contextMenuTab={contextMenuTab}
          handleClose={handleClose}
          moveCategory={moveCategory}
          handleRenameCategory={handleRenameCategory}
          handleAddCategory={handleAddCategory}
          handleRemoveCategory={handleRemoveCategory}
        />
        <FeatureContextMenu
          contextMenu={contextMenu}
          contextMenuFeature={contextMenuFeature}
          handleClose={handleClose}
          handleDuplicate={handleDuplicate}
          handleRemoveFromList={handleRemoveFromList}
          handleRemoveCompletely={handleRemoveCompletely}
        />
      </FeatureDragContext>
    </>
  )
}

export default SavedFeaturesDrawer
