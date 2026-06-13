"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/action-state";

export function useActionFeedback(state: ActionState, options?: { toastOnSuccess?: boolean; toastOnError?: boolean }) {
  const toastOnSuccess = options?.toastOnSuccess ?? true;
  const toastOnError = options?.toastOnError ?? true;

  useEffect(() => {
    if (!state.timestamp || !state.message) return;

    if (state.success && toastOnSuccess) {
      toast.success(state.message);
    }

    if (!state.success && toastOnError) {
      toast.error(state.message);
    }
  }, [state.message, state.success, state.timestamp, toastOnError, toastOnSuccess]);
}
