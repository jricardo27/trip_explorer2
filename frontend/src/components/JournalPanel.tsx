import { Visibility, Edit } from "@mui/icons-material"
import {
  Box,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Button,
} from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import React, { useState, useMemo, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

import client from "../api/client"
import type { TripDay } from "../types"

interface JournalPanelProps {
  tripId: string
  days: TripDay[]
}

interface JournalEditorProps {
  tripId: string
  day: TripDay
}

const JournalEditor: React.FC<JournalEditorProps> = ({ tripId, day }) => {
  const queryClient = useQueryClient()
  const [localNotes, setLocalNotes] = useState<string>(day.notes || "")
  const [isPreview, setIsPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<any>(null)

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNotes = e.target.value
    setLocalNotes(newNotes)
    setIsSaving(true)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      client
        .put(`/trips/${tripId}/days/${day.id}`, { notes: newNotes })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["trips", tripId] })
          setIsSaving(false)
        })
        .catch(() => setIsSaving(false))
    }, 1000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Paper sx={{ p: 3, minHeight: 600, display: "flex", flexDirection: "column" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5">{day.name || `Day ${(day.dayIndex ?? 0) + 1}`}</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {dayjs(day.date).format("dddd, MMMM D, YYYY")}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={3}>
          {isSaving && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Saving...
            </Typography>
          )}
          <Button
            variant="outlined"
            startIcon={isPreview ? <Edit /> : <Visibility />}
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? "Edit" : "Preview"}
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box flexGrow={1}>
        {isPreview ? (
          <Box
            className="markdown-preview"
            sx={{
              p: 2,
              bgcolor: "#fafafa",
              borderRadius: 1,
              border: "1px solid #eee",
              minHeight: 400,
              "& h1, & h2, & h3": { color: "primary.main" },
              "& p": { lineHeight: 1.6 },
            }}
          >
            <ReactMarkdown>{localNotes || "*No notes for this day yet.*"}</ReactMarkdown>
          </Box>
        ) : (
          <TextField
            fullWidth
            multiline
            variant="standard"
            placeholder="Write your thoughts for today (Markdown supported)..."
            value={localNotes}
            onChange={handleNoteChange}
            InputProps={{
              disableUnderline: true,
              sx: { fontSize: "1.1rem", lineHeight: 1.6, fontFamily: "serif" },
            }}
            sx={{ "& .MuiInputBase-root": { alignItems: "flex-start" } }}
            minRows={15}
          />
        )}
      </Box>
    </Paper>
  )
}

export const JournalPanel: React.FC<JournalPanelProps> = ({ tripId, days }) => {
  const [selectedDayId, setSelectedDayId] = useState<string>(days[0]?.id || "")
  const [search, setSearch] = useState("")

  const selectedDay = useMemo(() => days.find((d) => d.id === selectedDayId), [days, selectedDayId])

  const filteredDays = useMemo(
    () =>
      days.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (d.notes || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [days, search],
  )

  if (days.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="text.secondary">No days found for this trip.</Typography>
      </Box>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={3}>
        {/* Left Pane: Navigation */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <DateCalendar
              value={selectedDay ? dayjs(selectedDay.date) : null}
              onChange={(newDate) => {
                if (!newDate) return
                const matchingDay = days.find((d) => dayjs(d.date).isSame(newDate, "day"))
                if (matchingDay) setSelectedDayId(matchingDay.id)
              }}
              minDate={dayjs(days[0].date)}
              maxDate={dayjs(days[days.length - 1].date)}
              sx={{ width: "100%" }}
            />
          </Paper>

          <Paper variant="outlined" sx={{ height: 400, display: "flex", flexDirection: "column" }}>
            <Box p={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search days..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
            <Divider />
            <List sx={{ flexGrow: 1, overflow: "auto" }}>
              {filteredDays.map((day) => (
                <ListItem key={day.id} disablePadding>
                  <ListItemButton selected={selectedDayId === day.id} onClick={() => setSelectedDayId(day.id)}>
                    <ListItemText
                      primary={day.name || `Day ${(day.dayIndex ?? 0) + 1}`}
                      secondary={dayjs(day.date).format("ddd, MMM D")}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Right Pane: Content */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          {selectedDay ? (
            <JournalEditor key={selectedDay.id} tripId={tripId} day={selectedDay} />
          ) : (
            <Paper sx={{ p: 3, minHeight: 600, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Typography color="text.secondary">Select a day to view or edit the journal.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </LocalizationProvider>
  )
}
