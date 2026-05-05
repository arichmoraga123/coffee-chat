"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get("error");
    if (q === "GoogleRequiresRegisteredEmail") {
      setError("Sign in with Google using the same email you registered with, or create an account first.");
    }
    if (q === "MicrosoftRequiresRegisteredEmail") {
      setError("Sign in with Microsoft using the same email you registered with, or create an account first.");
    }
  }, [searchParams]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  };

  return (
    <div className="mx-auto mt-20 max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="mt-1 text-sm text-zinc-400">Access your private DealFlow workspace.</p>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-zinc-400">
          New here?{" "}
          <Link className="text-[#f5f5f5] underline-offset-4 hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-20 max-w-md text-center text-sm text-zinc-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
