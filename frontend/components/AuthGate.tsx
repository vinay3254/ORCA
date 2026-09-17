// frontend/components/AuthGate.tsx
"use client";
import { useState, FormEvent } from "react";
import { Waves } from "lucide-react";
import { signup, login } from "@/lib/chatClient";
import { AuthResponse } from "@/lib/types";

interface AuthGateProps {
  onAuthenticated: (auth: AuthResponse) => void;
  onSkip?: () => void;
}

export function AuthGate({ onAuthenticated, onSkip }: AuthGateProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const auth = mode === "login" ? await login(email, password) : await signup(email, password);
      onAuthenticated(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-7 space-y-5"
      >
        {/* Brand Mark */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-black/10">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-slate-900 leading-none">
              ORCA
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Marine Ecosystem Reasoning with Collaborative Agents
            </p>
          </div>
        </div>

        {/* Mode Switcher Pill */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
          />
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 rounded-full text-sm font-semibold bg-black text-white hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
        >
          {isSubmitting ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-xs font-semibold text-slate-500 hover:text-black transition-colors"
          >
            Continue without an account
          </button>
        )}
      </form>
    </div>
  );
}
