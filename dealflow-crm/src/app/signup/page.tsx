"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const signupResponse = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, refCode: searchParams.get("ref") ?? undefined }),
    });
    if (!signupResponse.ok) {
      const payload = (await signupResponse.json().catch(() => ({}))) as { error?: string };
      setLoading(false);
      setError(payload.error ?? "Could not create account.");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    setLoading(false);
    if (!result || result.error) {
      setError("Account created, but sign-in failed. Please log in.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto mt-20 max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-zinc-400">Start with an empty private rolodex.</p>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            required
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
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
            minLength={8}
            placeholder="Password (8+ chars)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link className="text-[#f0f0f0] underline-offset-4 hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-20 max-w-md text-center text-sm text-zinc-500">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
