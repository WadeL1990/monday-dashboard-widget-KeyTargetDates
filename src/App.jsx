import React from "react";
import SettingsPanel from "./settings/SettingsPanel";
import DeadlineDisplay from "./display/DeadlineDisplay";
import { useMondayContext } from "./hooks/useMondayContext";

export default function App() {
  const { isSettings, loading } = useMondayContext();

  if (loading) {
    return (
      <div style={{ padding: 12, fontFamily: "system-ui" }}>
        Loading…
      </div>
    );
  }

  return isSettings ? <SettingsPanel /> : <DeadlineDisplay />;
}
