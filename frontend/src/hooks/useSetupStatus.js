import { useEffect, useState } from "react";
import { api } from "../services/api";

// One fetch per app load, shared by the route gates in App.jsx so the
// wizard's "is this instance configured yet?" check only happens once
// regardless of how many gates consume it.
export function useSetupStatus() {
  const [completed, setCompleted] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    api
      .getSetupStatus()
      .then((status) => {
        if (!ignore) setCompleted(status.completed);
      })
      .catch(() => {
        // Setup status couldn't be reached - treat as "configured" so a
        // transient network hiccup never traps the whole app behind the
        // wizard redirect.
        if (!ignore) setCompleted(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { completed, loading };
}
