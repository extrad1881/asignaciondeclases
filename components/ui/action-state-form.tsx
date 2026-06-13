"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { ActionAlert } from "@/components/ui/action-alert";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { initialActionState, type ActionState } from "@/lib/actions/action-state";

type ActionStateFormProps = {
  action: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  alertClassName?: string;
};

export function ActionStateForm({ action, children, className, alertClassName }: ActionStateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useActionFeedback(state);

  return (
    <form action={formAction} aria-busy={pending} className={className}>
      {children}
      <ActionAlert className={alertClassName} state={state} />
    </form>
  );
}
