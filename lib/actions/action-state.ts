import { getSafeErrorMessage } from "@/lib/supabase/error-utils";

export type ActionState = {
  success: boolean;
  message: string;
  redirectTo?: string;
  timestamp: number;
};

export const initialActionState: ActionState = {
  success: false,
  message: "",
  timestamp: 0
};

export function actionSuccess(message: string, redirectTo?: string): ActionState {
  return {
    success: true,
    message,
    redirectTo,
    timestamp: Date.now()
  };
}

export function actionFailure(error: unknown, fallback?: string): ActionState {
  const message = fallback ?? getSafeErrorMessage(error);
  return {
    success: false,
    message,
    timestamp: Date.now()
  };
}
