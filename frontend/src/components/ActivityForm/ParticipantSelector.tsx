import {
  Grid,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Checkbox,
} from "@mui/material"

import { useLanguageStore } from "../../stores/languageStore"

interface Member {
  id: string
  name: string
  avatarUrl?: string
  color?: string
}

interface ParticipantSelectorProps {
  members: Member[]
  selectedMemberIds: string[]
  handleToggleMember: (memberId: string) => void
  canEdit: boolean
}

export const ParticipantSelector = ({
  members,
  selectedMemberIds,
  handleToggleMember,
  canEdit,
}: ParticipantSelectorProps) => {
  const { t } = useLanguageStore()

  return (
    <Grid size={{ xs: 12 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t("whoIsGoing")}
      </Typography>
      {members.length > 0 ? (
        <List dense sx={{ width: "100%", bgcolor: "background.paper", border: "1px solid #e0e0e0", borderRadius: 1 }}>
          {members.map((member) => {
            const labelId = `checkbox-list-secondary-label-${member.id}`
            return (
              <ListItem key={member.id} disablePadding>
                <ListItemButton onClick={() => handleToggleMember(member.id)} dense disabled={!canEdit}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: member.color, width: 32, height: 32, fontSize: "0.875rem" }}>
                      {member.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText id={labelId} primary={member.name} />
                  <Checkbox
                    edge="end"
                    checked={selectedMemberIds.indexOf(member.id) !== -1}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ "aria-labelledby": labelId }}
                    disabled={!canEdit}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t("noMembers")}
        </Typography>
      )}
    </Grid>
  )
}
