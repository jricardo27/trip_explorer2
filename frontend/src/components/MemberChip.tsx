import { Avatar, Chip, Typography, Box } from "@mui/material"

import type { TripMember } from "../types"

interface MemberChipProps {
  member: TripMember
  size?: "small" | "medium"
  showRole?: boolean
  onDelete?: () => void
  onClick?: () => void
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case "OWNER":
      return "Owner"
    case "EDITOR":
      return "Editor"
    case "VIEWER":
      return "Viewer"
    default:
      return role
  }
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "OWNER":
      return "#ef5350" // Red
    case "EDITOR":
      return "#42a5f5" // Blue
    case "VIEWER":
      return "#66bb6a" // Green
    default:
      return "#bdbdbd" // Grey
  }
}

export const MemberChip = ({ member, size = "medium", showRole = false, onDelete, onClick }: MemberChipProps) => {
  return (
    <Chip
      avatar={
        <Avatar
          src={member.avatarUrl}
          sx={{
            bgcolor: member.color || getRoleColor(member.role),
            width: 24,
            height: 24,
            fontSize: "0.75rem",
          }}
        >
          {member.name.charAt(0).toUpperCase()}
        </Avatar>
      }
      label={
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontSize: size === "small" ? "0.75rem" : "0.875rem" }}>
            {member.name}
          </Typography>
          {showRole && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              ({getRoleLabel(member.role)})
            </Typography>
          )}
        </Box>
      }
      size={size}
      onDelete={onDelete}
      onClick={onClick}
      variant="outlined"
      sx={{
        borderColor: member.color,
        bgcolor: member.color ? `${member.color}10` : "transparent",
      }}
    />
  )
}
