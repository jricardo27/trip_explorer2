import { AccountCircle } from "@mui/icons-material"
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Container,
  Tabs,
  Tab,
} from "@mui/material"
import { useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"

import { useAuthStore } from "../stores/authStore"
import { useLanguageStore } from "../stores/languageStore"

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { t, language, setLanguage } = useLanguageStore()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [currentTab, setCurrentTab] = useState(window.location.pathname.includes("/highlights") ? 1 : 0)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleClose()
    logout()
    navigate("/login")
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ mr: 4 }}>
            Trip Explorer
          </Typography>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => {
              setCurrentTab(newValue)
              navigate(newValue === 0 ? "/" : "/highlights")
            }}
            sx={{ flexGrow: 1 }}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label={t("myTrips")} />
            <Tab label={t("highlights")} />
          </Tabs>
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              {user?.email ? (
                <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>{user.email[0].toUpperCase()}</Avatar>
              ) : (
                <AccountCircle />
              )}
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>{user?.email}</MenuItem>

              <MenuItem
                onClick={() => {
                  handleClose()
                  navigate("/settings")
                }}
              >
                {t("settings")}
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setLanguage(language === "en" ? "es" : "en")
                }}
              >
                Language: {language === "en" ? "English" : "Español"}
              </MenuItem>

              <MenuItem onClick={handleLogout}>{t("logout")}</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ mt: { xs: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  )
}
