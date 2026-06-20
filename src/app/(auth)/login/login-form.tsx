"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const EmailPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "At least 6 characters"),
});

type EmailPasswordValues = z.infer<typeof EmailPasswordSchema>;
type AuthMode = "signin" | "signup";

// Google OAuth is temporarily hidden from the login screen (not removed -
// see handleGoogleLogin below) until the provider is fully configured.
const GOOGLE_SIGN_IN_ENABLED = false;

export function LoginForm() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("signin");

  async function handleGoogleLogin() {
    setGoogleError(null);
    setIsGoogleLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setGoogleError(error.message);
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {GOOGLE_SIGN_IN_ENABLED && (
        <>
          <Button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            variant="outline"
            className="w-full"
          >
            {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
          </Button>
          {googleError && <p className="text-sm text-destructive">{googleError}</p>}

          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <Tabs value={mode} onValueChange={(v) => setMode(v as AuthMode)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
      </Tabs>

      <EmailPasswordForm mode={mode} />
    </div>
  );
}

function EmailPasswordForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const form = useForm<EmailPasswordValues>({
    resolver: zodResolver(EmailPasswordSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: EmailPasswordValues) {
    setError(null);
    setInfo(null);
    setIsPending(true);

    const supabase = getSupabaseBrowserClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword(values);
      if (signInError) {
        setIsPending(false);
        setError(signInError.message);
        return;
      }
      // Keep the pending state on through navigation - the dashboard does
      // its own data fetching before it paints, so clearing isPending here
      // would re-enable the button while the screen still looks frozen.
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setIsPending(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setInfo("Account created - check your email to confirm it before signing in.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-muted-foreground">{info}</p>}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending
            ? mode === "signin"
              ? "Signing in..."
              : "Creating account..."
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>
    </Form>
  );
}
