import {
  Box,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material"
import React from "react"
import { TbPoint } from "react-icons/tb"

const Tutorial = (): React.ReactNode => {
  return (
    <Box p={2}>
      <Typography variant="h6">Base layer</Typography>

      <Typography variant="body1">
        You can select the base layer to use for the map by opening the layer control on the top-right corner.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/layer_control.webp" alt="Layer control" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/layer_control_open.webp" alt="Layer control opened" />
        </ImageListItem>
      </ImageList>

      <Typography variant="body1">
        <br />
        Current options are:
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/docs/img/openstreetmap_layer.webp" alt="OpenStreet Map" />
          <ImageListItemBar position="below" title="OpenStreet Map" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/docs/img/cyclosm_layer.webp" alt="CyclOSM (slow to load)" />
          <ImageListItemBar position="below" title="CyclOSM (slow to load)" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/docs/img/esri_world_imagery_layer.webp" alt="Esri World Imagery" />
          <ImageListItemBar position="below" title="Esri World Imagery" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/docs/img/esri_world_street_map_layer.webp" alt="Esri World Street Map" />
          <ImageListItemBar position="below" title="Esri World Street Map" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/docs/img/esri_world_topographic_map_layer.webp" alt="Esri World Topographic Map" />
          <ImageListItemBar position="below" title="Esri World Topographic Map" />
        </ImageListItem>
      </ImageList>

      <Typography variant="h6">Points of Interest (POIs)</Typography>

      <Typography variant="body1">
        On the same layer control on the top-right corner, there&#39;s a list of data sources you can choose from.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/overlay_selector.webp" alt="Overlay Selector" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/overlay_selector_with_selection.webp" alt="Overlay Selector with selection" />
        </ImageListItem>
      </ImageList>

      <Typography variant="body1">
        <br />
        Available POIs sources vary depending on the destination. For example, if you are travelling to Western
        Australia, you can select from the following:
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/docs/img/national_parks.webp" alt="Western Australia National Parks" />
          <ImageListItemBar title="National Parks in Western Australia" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/campermate_pois.webp" alt="Campermate POIs in Western Australia" />
          <ImageListItemBar title="Campermate POIs in Western Australia" />
        </ImageListItem>
      </ImageList>

      <Typography variant="h6">Saving Points of Interest (POIs)</Typography>

      <Typography variant="body1">
        The main feature of the app is the ability to select points of interest (POIs) on the map and export them as a
        KML. It can be done by:
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <TbPoint />
          </ListItemIcon>
          <ListItemText primary="Right clicking on any POI" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <TbPoint />
          </ListItemIcon>
          <ListItemText primary="Right clicking on any point the map, a custom name can be assigned to the point." />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <TbPoint />
          </ListItemIcon>
          <ListItemText primary="On the POI's popup and using the Save button" />
        </ListItem>
      </List>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/context_menu_on_map.webp" alt="Context menu on map" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/save_poi_on_popup.webp" alt="Save POI from popup" />
        </ImageListItem>
      </ImageList>

      <Typography variant="h6">POIs Drawer</Typography>

      <Typography variant="body1">
        <br />
        The saved POIs can be accessed by opening the hamburger menu in the top-left corner of the map, next to the zoom
        controls.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/poi_list_hamburger.webp" alt="POI saved list hamburger menu" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/poi_list_drawer.webp" alt="POI saved list drawer" />
        </ImageListItem>
      </ImageList>

      <Typography variant="body1">
        <br />
        By default, only the <strong>ALL</strong> category is present, but users can add custom categories, such as{" "}
        <strong>FIRST DAY</strong> and
        <strong>SECOND DAY</strong>, by right-clicking on the left side of the drawer.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/category_list_context_menu.webp" alt="Category list context menu" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/category_list_new.webp" alt="Category list with new category" />
        </ImageListItem>
      </ImageList>

      <Typography variant="body1">
        <br />
        <br />
        Categories can be rearranged, deleted, or renamed, except for the *ALL* category.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img
            src="public/help/img/category_list_second_context_menu.webp"
            alt="Category list context menu for categories different from ALL"
          />
        </ImageListItem>
      </ImageList>

      <Typography variant="body1">
        <br />
        <br />
        Clicking on a POI on the saved list will expand the POI&#39;s details. An editor can be toggled into view to
        append comments to the POI.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/selection_list_one_element_open.webp" alt="POI details" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/selection_list_one_element_editor.webp" alt="POI notes editor" />
        </ImageListItem>
      </ImageList>

      <Typography variant="body1">
        <br />
        <br />
        POI details can also be seen when opening the popup by clicking on the POI on the map. Note that on small
        screens the gallery will be shown as a tab.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/feature_general.webp" alt="POI popup general tab" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/feature_more_info.webp" alt="POI popup more info tab" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/feature_gallery.webp" alt="POI popup gallery" />
        </ImageListItem>
        <ImageListItem>
          <img src="public/help/img/feature_gallery_mobile.webp" alt="POI popup gallery tab" />
        </ImageListItem>
      </ImageList>

      <Typography variant="h6">Exporting</Typography>

      <Typography variant="body1">
        <br />
        Saved POIs can be exported as a GeoJSON or KML file, with a zip file automatically downloaded when the desired
        option is selected.
        <br />
        <br />
        <strong>Note:</strong>
        When exporting to KML, polygons are converted to MultiLineStrings due to a limitation in the Organic Maps app
        that does not support polygons, the converted MultiLineStrings are shown as tracks.
        <br />
        <br />
        Google Earth does not have this limitation, and in the future, it may be possible to select whether to export a
        KML including polygons or not.
      </Typography>

      <ImageList>
        <ImageListItem>
          <img src="public/help/img/export_menu.webp" alt="Export Menu" />
        </ImageListItem>
      </ImageList>
    </Box>
  )
}

export default Tutorial
