import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Inloggen | Kadedatabase",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-navy/40 mt-8 text-center">Laden…</div>}>
      <LoginForm />
    </Suspense>
  );
}
