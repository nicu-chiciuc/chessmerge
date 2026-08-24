import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Trash2, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../convex/_generated/api";
import { ACCOUNT_DELETION_CONFIRMATION } from "../../lib/accountDeletion";
import {
  isValidPublicName,
  PUBLIC_NAME_HTML_PATTERN,
  PUBLIC_NAME_MAX_LENGTH,
  PUBLIC_NAME_MIN_LENGTH,
  trimPublicName,
} from "../../lib/publicName";
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

type NameState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "taken" }
  | { kind: "failed" };

const NAME_REQUIREMENTS =
  "Use 4 to 24 letters, numbers, underscores, or hyphens.";

function PublicNameForm({ currentName }: { currentName: string }) {
  const updateName = useMutation(api.accounts.updateName);
  const [name, setName] = useState({
    draft: currentName,
    serverName: currentName,
  });
  const [state, setState] = useState<NameState>({ kind: "idle" });
  const trimmedName = trimPublicName(name.draft);
  const invalid = !isValidPublicName(trimmedName);
  const dirty = name.draft !== name.serverName;
  const saving = state.kind === "saving";

  useEffect(() => {
    setName((previous) => ({
      draft:
        previous.draft === previous.serverName ? currentName : previous.draft,
      serverName: currentName,
    }));
  }, [currentName]);

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (invalid || !dirty || saving) return;

    setName((previous) => ({ ...previous, draft: trimmedName }));
    setState({ kind: "saving" });
    try {
      const result = await updateName({ name: trimmedName });
      if (result.status === "taken") {
        setState({ kind: "taken" });
        return;
      }

      setName({ draft: result.name, serverName: result.name });
      setState({ kind: "saved" });
    } catch {
      setState({ kind: "failed" });
    }
  };

  return (
    <form
      className="max-w-lg space-y-3"
      noValidate
      onSubmit={(event) => void saveName(event)}
    >
      <div className="space-y-2">
        <Label htmlFor="public-name">Public name</Label>
        <Input
          id="public-name"
          name="username"
          autoComplete="username"
          value={name.draft}
          minLength={PUBLIC_NAME_MIN_LENGTH}
          maxLength={PUBLIC_NAME_MAX_LENGTH}
          pattern={PUBLIC_NAME_HTML_PATTERN}
          aria-describedby="public-name-requirements public-name-status"
          aria-invalid={dirty && invalid}
          disabled={saving}
          onChange={(event) => {
            setName((previous) => ({
              ...previous,
              draft: event.target.value,
            }));
            setState({ kind: "idle" });
          }}
        />
        <p
          id="public-name-requirements"
          className="text-sm text-muted-foreground"
        >
          {NAME_REQUIREMENTS}
        </p>
      </div>
      <Button type="submit" disabled={saving || invalid || !dirty}>
        {saving ? "Saving name…" : "Save name"}
      </Button>
      <div id="public-name-status" aria-live="polite">
        {dirty && invalid ? (
          <p className="text-sm text-destructive" role="alert">
            {NAME_REQUIREMENTS}
          </p>
        ) : state.kind === "taken" ? (
          <p className="text-sm text-destructive" role="alert">
            That name is already taken.
          </p>
        ) : state.kind === "failed" ? (
          <p className="text-sm text-destructive" role="alert">
            Could not save the name. Try again.
          </p>
        ) : state.kind === "saved" ? (
          <p className="text-sm text-emerald-700" role="status">
            Name saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}

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
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <PublicNameForm currentName={user.name} />
              <dl className="text-sm">
                <div className="rounded-lg border bg-background p-4">
                  <dt className="text-muted-foreground">Account type</dt>
                  <dd className="mt-1 font-medium">
                    {user.isGuest ? "Guest" : "Registered"}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/45">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-2xl text-destructive">
              <Trash2 aria-hidden="true" />
              Delete account
            </CardTitle>
            <CardDescription className="max-w-2xl leading-6">
              Deleting your account removes your sign-in details and public
              name. Your games and move history stay on ChessMerge under
              "Deleted player". A game in progress ends as a resignation.
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
