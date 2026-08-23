"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CredentialsFlow = "signIn" | "signUp";
type AuthStep =
  | "credentials"
  | "verifyEmail"
  | "requestReset"
  | "resetPassword";

const PASSWORD_MIN_LENGTH = 8;
const USERNAME_MIN_LENGTH = 4;
const USERNAME_MAX_LENGTH = 24;

export function SignInForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<CredentialsFlow>("signIn");
  const [step, setStep] = useState<AuthStep>("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showStep = (nextStep: AuthStep) => {
    setSubmitting(false);
    setStep(nextStep);
  };

  const showCredentials = () => {
    setFlow("signIn");
    showStep("credentials");
  };

  const handleCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = formValue(formData, "email").trim();
    const password = formValue(formData, "password");
    const confirmPassword = formValue(formData, "confirmPassword");
    const username = formValue(formData, "username").trim();

    if (
      flow === "signUp" &&
      (username.length < USERNAME_MIN_LENGTH ||
        username.length > USERNAME_MAX_LENGTH ||
        !/^[A-Za-z0-9_-]+$/.test(username))
    ) {
      toast.error(
        "Username must be 4–24 characters using letters, numbers, _ or -.",
      );
      setSubmitting(false);
      return;
    }

    if (flow === "signUp" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    formData.set("email", email);
    if (flow === "signUp") formData.set("username", username);
    formData.set("flow", flow);
    formData.delete("confirmPassword");

    try {
      const result = await signIn("password", formData);
      if (result.signingIn) {
        void navigate({ to: "/" });
        return;
      }

      setPendingEmail(email);
      showStep("verifyEmail");
    } catch (error) {
      toast.error(credentialsErrorMessage(error, flow));
      setSubmitting(false);
    }
  };

  const handleEmailVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("email", pendingEmail);
    formData.set("flow", "email-verification");

    try {
      const result = await signIn("password", formData);
      if (!result.signingIn) {
        throw new Error("Email verification did not complete");
      }
      toast.success("Email verified. You are signed in.");
      void navigate({ to: "/" });
    } catch {
      toast.error("That code is invalid or expired. Request a new one.");
      setSubmitting(false);
    }
  };

  const handleResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = formValue(formData, "email").trim();
    formData.set("email", email);
    formData.set("flow", "reset");

    try {
      await signIn("password", formData);
      setPendingEmail(email);
      showStep("resetPassword");
    } catch {
      toast.error(
        "Could not send a reset code. Check the email and try again.",
      );
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = formValue(formData, "newPassword");
    const confirmPassword = formValue(formData, "confirmPassword");

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    formData.set("email", pendingEmail);
    formData.set("flow", "reset-verification");
    formData.delete("confirmPassword");

    try {
      const result = await signIn("password", formData);
      if (!result.signingIn) {
        throw new Error("Password reset did not complete");
      }
      toast.success("Password updated. You are signed in.");
      void navigate({ to: "/" });
    } catch {
      toast.error(
        "That code is invalid or expired, or the new password is too short.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {titleForStep(step, flow)}
          </CardTitle>
          <CardDescription className="text-center">
            {descriptionForStep(step, flow, pendingEmail)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "credentials" && (
            <>
              <form
                key={flow}
                className="space-y-4"
                onSubmit={(event) => void handleCredentials(event)}
              >
                {flow === "signUp" && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      name="username"
                      placeholder="Public in games"
                      autoComplete="username"
                      minLength={USERNAME_MIN_LENGTH}
                      maxLength={USERNAME_MAX_LENGTH}
                      pattern="[A-Za-z0-9_-]+"
                      required
                      className="w-full"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="password">Password</Label>
                    {flow === "signIn" && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={() => showStep("requestReset")}
                      >
                        Forgot password?
                      </Button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="At least 8 characters"
                    autoComplete={
                      flow === "signIn" ? "current-password" : "new-password"
                    }
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                    className="w-full"
                  />
                </div>
                {flow === "signUp" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      placeholder="Enter the password again"
                      autoComplete="new-password"
                      minLength={PASSWORD_MIN_LENGTH}
                      required
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      We will email you an 8-digit code before you can sign in.
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting
                    ? flow === "signIn"
                      ? "Signing in..."
                      : "Creating account..."
                    : flow === "signIn"
                      ? "Sign in"
                      : "Create account"}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {flow === "signIn"
                    ? "Do not have an account? "
                    : "Already have an account? "}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-medium"
                  disabled={submitting}
                  onClick={() =>
                    setFlow(flow === "signIn" ? "signUp" : "signIn")
                  }
                >
                  {flow === "signIn" ? "Create one" : "Sign in"}
                </Button>
              </div>
            </>
          )}

          {step === "verifyEmail" && (
            <form
              className="space-y-4"
              onSubmit={(event) => void handleEmailVerification(event)}
            >
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification code</Label>
                <Input
                  id="verificationCode"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  minLength={8}
                  maxLength={8}
                  placeholder="12345678"
                  required
                  autoFocus
                  className="text-center text-lg tracking-[0.35em]"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? "Verifying..." : "Verify email"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                disabled={submitting}
                onClick={showCredentials}
              >
                Back to sign in
              </Button>
            </form>
          )}

          {step === "requestReset" && (
            <form
              className="space-y-4"
              onSubmit={(event) => void handleResetRequest(event)}
            >
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? "Sending..." : "Send reset code"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                disabled={submitting}
                onClick={showCredentials}
              >
                Back to sign in
              </Button>
            </form>
          )}

          {step === "resetPassword" && (
            <form
              className="space-y-4"
              onSubmit={(event) => void handlePasswordReset(event)}
            >
              <div className="space-y-2">
                <Label htmlFor="resetCode">Reset code</Label>
                <Input
                  id="resetCode"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  minLength={8}
                  maxLength={8}
                  placeholder="12345678"
                  required
                  autoFocus
                  className="text-center text-lg tracking-[0.35em]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetConfirmPassword">Confirm password</Label>
                <Input
                  id="resetConfirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  placeholder="Enter the password again"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? "Updating..." : "Update password"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                disabled={submitting}
                onClick={() => showStep("requestReset")}
              >
                Request a new code
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function titleForStep(step: AuthStep, flow: CredentialsFlow) {
  if (step === "verifyEmail") return "Check your email";
  if (step === "requestReset") return "Reset your password";
  if (step === "resetPassword") return "Choose a new password";
  return flow === "signIn" ? "Welcome back" : "Create account";
}

function descriptionForStep(
  step: AuthStep,
  flow: CredentialsFlow,
  pendingEmail: string,
) {
  if (step === "verifyEmail") {
    return `Enter the 8-digit code sent to ${pendingEmail}.`;
  }
  if (step === "requestReset") {
    return "We will send an 8-digit reset code to your email.";
  }
  if (step === "resetPassword") {
    return `Enter the code sent to ${pendingEmail} and choose a new password.`;
  }
  return flow === "signIn"
    ? "Enter your email and password to continue."
    : "Create an account, then verify your email.";
}

function credentialsErrorMessage(
  error: unknown,
  flow: CredentialsFlow,
): string {
  const message = error instanceof Error ? error.message : "";

  if (flow === "signUp" && /invalid password/i.test(message)) {
    return "Password must be at least 8 characters.";
  }
  if (flow === "signUp" && /invalid username/i.test(message)) {
    return "Username must be 4–24 characters using letters, numbers, _ or -.";
  }
  if (flow === "signUp" && /username already taken/i.test(message)) {
    return "That username is already taken.";
  }
  if (
    flow === "signIn" &&
    /(invalid credentials|invalidsecret)/i.test(message)
  ) {
    return "Email or password is incorrect.";
  }
  return flow === "signIn"
    ? "Could not sign in. Check your details and try again."
    : "Could not create the account. Try signing in if it already exists.";
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
