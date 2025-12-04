import { Autocomplete, TextField, CircularProgress, Box, Typography, Grid } from "@mui/material"
import { debounce } from "@mui/material/utils"
import React, { useState, useEffect, useMemo } from "react"
import { MdLocationOn } from "react-icons/md"

export interface CityOption {
  id: number
  name: string
  country_name: string
  country_code: string
  latitude: string
  longitude: string
}

interface LocationAutocompleteProps {
  value: CityOption | null
  onChange: (value: CityOption | null) => void
  label?: string
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  label = "Search for a city",
}) => {
  const [inputValue, setInputValue] = useState("")
  const [options, setOptions] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCities = useMemo(
    () =>
      debounce(async (input: string, callback: (results: CityOption[]) => void) => {
        if (input.length < 2) {
          callback([])
          return
        }

        try {
          const API_URL = import.meta.env.VITE_API_URL || ""
          const response = await fetch(`${API_URL}/api/locations/search?q=${encodeURIComponent(input)}`)
          if (response.ok) {
            const data = await response.json()
            callback(data)
          } else {
            callback([])
          }
        } catch (error) {
          console.error("Error fetching cities:", error)
          callback([])
        }
      }, 400),
    [],
  )

  useEffect(() => {
    let active = true

    if (inputValue === "") {
      setOptions(value ? [value] : [])
      return undefined
    }

    setLoading(true)
    fetchCities(inputValue, (results) => {
      if (active) {
        let newOptions: CityOption[] = []

        if (value) {
          newOptions = [value]
        }

        if (results) {
          newOptions = [...newOptions, ...results]
        }

        // Remove duplicates based on ID
        const uniqueOptions = Array.from(new Map(newOptions.map((item) => [item.id, item])).values())

        setOptions(uniqueOptions)
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [inputValue, fetchCities, value])

  return (
    <Autocomplete
      id="location-autocomplete"
      getOptionLabel={(option) => (typeof option === "string" ? option : `${option.name}, ${option.country_name}`)}
      filterOptions={(x) => x}
      options={options}
      autoComplete
      includeInputInList
      filterSelectedOptions
      value={value}
      noOptionsText="No locations found"
      onChange={(_event, newValue: CityOption | null) => {
        setOptions(newValue ? [newValue, ...options] : options)
        onChange(newValue)
      }}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue)
      }}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, react/prop-types
        const { key, ...otherProps } = props
        return (
          <li key={option.id} {...otherProps}>
            <Grid container alignItems="center">
              <Grid item sx={{ display: "flex", width: 44 }}>
                <MdLocationOn style={{ color: "text.secondary" }} />
              </Grid>
              <Grid item sx={{ width: "calc(100% - 44px)", wordWrap: "break-word" }}>
                <Box component="span" sx={{ fontWeight: "bold" }}>
                  {option.name}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {option.country_name}
                </Typography>
              </Grid>
            </Grid>
          </li>
        )
      }}
    />
  )
}
