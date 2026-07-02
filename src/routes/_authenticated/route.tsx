import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    const onboardingDone = profile?.onboarding_completed === true;
    const path = location.pathname;

    if (!onboardingDone && path !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    if (onboardingDone && path === "/onboarding") {
      throw redirect({ to: "/dashboard" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});