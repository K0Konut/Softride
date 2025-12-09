import { createHashRouter } from "react-router-dom";
import AppShell from "../layout/AppShell";
import Home from "../../features/map/Home";
import MapScreen from "../../features/map/MapScreen";
import SettingsScreen from "../../features/settings/SettingScreen";

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/map", element: <MapScreen /> },
      { path: "/settings", element: <SettingsScreen /> },
    ],
  },
]);
