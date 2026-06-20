import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ disabled?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { disabled } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex justify-center">
            <Logo className="text-2xl" />
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Sign in to start practicing.
          </p>
          {disabled && (
            <p className="text-center text-sm text-destructive">
              Your account has been disabled. Contact your admin.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
