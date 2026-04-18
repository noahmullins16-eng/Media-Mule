import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_ID_KEY = "mmc-visitor-id";

function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export const useVisitorTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();

    supabase
      .from("site_visits")
      .insert({ visitor_id: visitorId, page_path: location.pathname })
      .then(); // fire and forget
  }, [location.pathname]);
};
