import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuperadmin = () => {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperadmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.rpc('is_superadmin', { _user_id: user.id });
        if (!error && data) {
          setIsSuperadmin(true);
        }
      }
      setLoading(false);
    };

    checkSuperadmin();
  }, []);

  return { isSuperadmin, loading };
};
