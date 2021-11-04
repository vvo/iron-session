import useSWR from "swr";

export default function useEvents(user) {
  // We do a request to /api/events only if the user is logged in
  const { data: events } = useSWR(user?.isLoggedIn ? `/api/events` : null);

  return { events };
}
