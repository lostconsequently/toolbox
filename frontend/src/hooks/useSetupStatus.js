import { useEffect, useState } from "react";
import { api } from "../services/api";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One fetch per app load, shared by the route gates in App.jsx so the
// wizard's "is this instance configured yet?" check only happens once
// regardless of how many gates consume it.
export function useSetupStatus() {
  const [completed, setCompleted] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    // One short retry before giving up: a genuinely fresh install's very
    // first page load can race a backend that isn't listening yet (e.g. a
    // container still starting up), and failing open immediately in that
    // window would skip the wizard entirely for that load instead of just
    // showing it a beat later. A real "backend is fully down" case still
    // falls through to the fail-open below after this one retry.
    api
      .getSetupStatus()
      .catch(async () => {
        if (ignore) return undefined;

        await wait(800);

        return api.getSetupStatus();
      })
      .then((status) => {
        if (!ignore && status) setCompleted(status.completed);
      })
      .catch(() => {
        // Setup status still couldn't be reached after the retry - treat as
        // "configured" so a genuine outage never traps an already-set-up
        // instance behind the wizard redirect.
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
