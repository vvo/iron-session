import useSWR from "swr";
import { SessionData, defaultSession } from "./lib";
import useSWRMutation from "swr/mutation";

const sessionApiRoute =
  "/app-router-client-component-route-handler-swr/session";

async function fetchJson<JSON = unknown>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<JSON> {
  return fetch(input, {
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    ...init,
  }).then((res) => res.json());
}

function doLogin(url: string, { arg }: { arg: string }) {
  return fetchJson<SessionData>(url, {
    method: "POST",
    body: JSON.stringify({ username: arg }),
  });
}

function doLogout(url: string) {
  return fetchJson<SessionData>(url, {
    method: "DELETE",
  });
}

function doIncrement(url: string) {
  return fetchJson<SessionData>(url, {
    method: "PATCH",
  });
}

export default function useSession() {
  const { data: session, isLoading } = useSWR(
    sessionApiRoute,
    fetchJson<SessionData>,
    {
      fallbackData: defaultSession,
    },
  );

  const { trigger: login } = useSWRMutation(sessionApiRoute, doLogin, {
    // the login route already provides the updated information, no need to revalidate
    revalidate: false,
  });
  const { trigger: logout } = useSWRMutation(sessionApiRoute, doLogout);
  const { trigger: increment } = useSWRMutation(sessionApiRoute, doIncrement);

  return { session, logout, login, increment, isLoading };
}
