import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../../convex/_generated/api";
import { ACCOUNT_DELETION_CONFIRMATION } from "../../lib/accountDeletion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeleteState =
  | { kind: "idle" }
  | { kind: "deleting" }
  | { kind: "failed"; message: string };

export function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const deleteAccount = useMutation(api.accounts.deleteAccount);
  const user = useQuery(api.auth.loggedInUser);
  const [confirmation, setConfirmation] = useState("");
  const [state, setState] = useState<DeleteState>({ kind: "idle" });

  useEffect(() => {
    if (user === null) void navigate({ to: "/login", replace: true });
  }, [navigate, user]);

  if (user === undefined) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-4">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </div>
    );
  }
  if (user === null) return null;

  const confirmed = confirmation === ACCOUNT_DELETION_CONFIRMATION;
  const deleting = state.kind === "deleting";

  const removeAccount = async () => {
    if (!confirmed || deleting) return;
    setState({ kind: "deleting" });
    try {
      await deleteAccount({ confirmation: ACCOUNT_DELETION_CONFIRMATION });
      await signOut();
      await navigate({ to: "/", replace: true });
    } catch {
      setState({
        kind: "failed",
        message: "Could not delete the account. Try again.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {user.isGuest ? "Guest account" : "Player account"}
        </p>
        <h1 className="mt-2 font-serif text-[clamp(2.25rem,8vw,4.25rem)] leading-none tracking-tight">
          Account settings
        </h1>
      </header>

      <div className="mt-7 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-2xl">
              <UserRound aria-hidden="true" />
              Public player
            </CardTitle>
            <CardDescription>
              This is how your name appears in games and the lobby.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="mt-1 break-words font-medium">{user.name}</dd>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <dt className="text-muted-foreground">Account type</dt>
                <dd className="mt-1 font-medium">
                  {user.isGuest ? "Guest" : "Registered"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-destructive/45">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-2xl text-destructive">
              <Trash2 aria-hidden="true" />
              Delete account
            </CardTitle>
            <CardDescription className="max-w-2xl leading-6">
              Deleting your account removes your sign-in details, public name,
              and newsletter subscription. Your games and move history stay on
              ChessMerge under "Deleted player". A game in progress ends as a
              resignation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-lg space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="account-deletion-confirmation"
                  className="flex-wrap leading-5"
                >
                  Type
                  <code className="whitespace-nowrap">
                    {ACCOUNT_DELETION_CONFIRMATION}
                  </code>
                  to confirm
                </Label>
                <Input
                  id="account-deletion-confirmation"
                  value={confirmation}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={deleting}
                  onChange={(event) => {
                    setConfirmation(event.target.value);
                    if (state.kind === "failed") setState({ kind: "idle" });
                  }}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={!confirmed || deleting}
                onClick={() => void removeAccount()}
              >
                <Trash2 aria-hidden="true" />
                {deleting ? "Deleting account…" : "Delete account"}
              </Button>
              {state.kind === "failed" ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.message}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
