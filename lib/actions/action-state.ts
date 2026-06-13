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

export function actionFailure(error: unknown, fallback = "No se pudo completar la accion."): ActionState {
  return {
    success: false,
    message: error instanceof Error && error.message ? error.message : fallback,
    timestamp: Date.now()
  };
}
