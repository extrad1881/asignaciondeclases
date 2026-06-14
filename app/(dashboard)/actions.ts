"use server";

import {
  createAssignmentAction as createAssignmentActionImpl,
  deleteAssignmentAction as deleteAssignmentActionImpl,
  updateAssignmentAction as updateAssignmentActionImpl
} from "./actions/asignaciones";
import {
  createCustomScheduleBlockAction as createCustomScheduleBlockActionImpl
} from "./actions/horarios";
import {
  assignCoordinatorCareerAction as assignCoordinatorCareerActionImpl,
  deleteCoordinatorRecordAction as deleteCoordinatorRecordActionImpl,
  updateCoordinatorCareersAction as updateCoordinatorCareersActionImpl,
  updateCoordinatorRecordAction as updateCoordinatorRecordActionImpl,
  updateCoordinatorUserAction as updateCoordinatorUserActionImpl
} from "./actions/coordinadores";
import {
  assignCoordinatorTeacherAction as assignCoordinatorTeacherActionImpl,
  createTeacherAction as createTeacherActionImpl,
  setTeacherActiveAction as setTeacherActiveActionImpl,
  updateTeacherMaxHoursAction as updateTeacherMaxHoursActionImpl,
  updateTeacherProfilesAction as updateTeacherProfilesActionImpl
} from "./actions/docentes";
import {
  createGroupAction as createGroupActionImpl,
  createGroupStateAction as createGroupStateActionImpl,
  deleteGroupAction as deleteGroupActionImpl,
  deleteGroupFeedbackAction as deleteGroupFeedbackActionImpl,
  setGroupArchivedAction as setGroupArchivedActionImpl,
  setGroupDraftAction as setGroupDraftActionImpl,
  setGroupFinalAction as setGroupFinalActionImpl,
  setGroupReviewAction as setGroupReviewActionImpl
} from "./actions/grupos";
import {
  createSubjectAction as createSubjectActionImpl,
  setSubjectActiveAction as setSubjectActiveActionImpl,
  updateSubjectAction as updateSubjectActionImpl
} from "./actions/materias";
import {
  createUserAction as createUserActionImpl,
  updateUserAction as updateUserActionImpl
} from "./actions/usuarios";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";

async function runFeedbackAction(
  action: () => Promise<unknown>,
  successMessage: string,
  fallbackMessage = "No se pudo completar la accion.",
  redirectTo?: string
) {
  try {
    await action();
    return actionSuccess(successMessage, redirectTo);
  } catch (error) {
    return actionFailure(error, fallbackMessage);
  }
}

export async function createGroupAction(formData: FormData) {
  return createGroupActionImpl(formData);
}

export async function createGroupStateAction(previousState: ActionState, formData: FormData) {
  return createGroupStateActionImpl(previousState, formData);
}

export async function createAssignmentAction(formData: FormData) {
  return createAssignmentActionImpl(formData);
}

export async function createAssignmentStateAction(_previousState: ActionState, formData: FormData) {
  return runFeedbackAction(
    () => createAssignmentActionImpl(formData),
    "Asignacion guardada correctamente.",
    "No se pudo guardar la asignacion."
  );
}

export async function updateAssignmentAction(formData: FormData) {
  return updateAssignmentActionImpl(formData);
}

export async function updateAssignmentFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => updateAssignmentActionImpl(formData),
    "Asignacion actualizada correctamente.",
    "No se pudo actualizar la asignacion."
  );
}

export async function deleteAssignmentAction(formData: FormData) {
  return deleteAssignmentActionImpl(formData);
}

export async function deleteAssignmentFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => deleteAssignmentActionImpl(formData),
    "Asignacion eliminada correctamente.",
    "No se pudo eliminar la asignacion."
  );
}

export async function deleteGroupAction(formData: FormData) {
  return deleteGroupActionImpl(formData);
}

export async function deleteGroupFeedbackAction(formData: FormData) {
  return deleteGroupFeedbackActionImpl(formData);
}

export async function createUserAction(formData: FormData) {
  return createUserActionImpl(formData);
}

export async function createUserStateAction(_previousState: ActionState, formData: FormData) {
  return runFeedbackAction(() => createUserActionImpl(formData), "Usuario creado correctamente.", "No se pudo crear el usuario.");
}

export async function updateUserAction(formData: FormData) {
  return updateUserActionImpl(formData);
}

export async function updateUserFeedbackAction(formData: FormData) {
  return runFeedbackAction(() => updateUserActionImpl(formData), "Usuario actualizado correctamente.", "No se pudo actualizar el usuario.");
}

export async function updateCoordinatorUserAction(formData: FormData) {
  return updateCoordinatorUserActionImpl(formData);
}

export async function updateCoordinatorUserFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => updateCoordinatorUserActionImpl(formData),
    "Usuario del coordinador actualizado correctamente.",
    "No se pudo actualizar el usuario del coordinador."
  );
}

export async function updateCoordinatorRecordAction(formData: FormData) {
  return updateCoordinatorRecordActionImpl(formData);
}

export async function updateCoordinatorRecordFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => updateCoordinatorRecordActionImpl(formData),
    "Coordinador actualizado correctamente.",
    "No se pudo actualizar el coordinador."
  );
}

export async function deleteCoordinatorRecordAction(formData: FormData) {
  return deleteCoordinatorRecordActionImpl(formData);
}

export async function deleteCoordinatorRecordFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => deleteCoordinatorRecordActionImpl(formData),
    "Coordinador eliminado correctamente.",
    "No se pudo eliminar el coordinador."
  );
}

export async function updateCoordinatorCareersAction(formData: FormData) {
  return updateCoordinatorCareersActionImpl(formData);
}

export async function updateCoordinatorCareersFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => updateCoordinatorCareersActionImpl(formData),
    "Carreras del coordinador actualizadas correctamente.",
    "No se pudieron actualizar las carreras del coordinador."
  );
}

export async function createTeacherAction(formData: FormData) {
  return createTeacherActionImpl(formData);
}

export async function createTeacherStateAction(_previousState: ActionState, formData: FormData) {
  return runFeedbackAction(() => createTeacherActionImpl(formData), "Docente guardado correctamente.", "No se pudo guardar el docente.");
}

export async function updateTeacherProfilesAction(formData: FormData) {
  return updateTeacherProfilesActionImpl(formData);
}

export async function updateTeacherProfilesFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => updateTeacherProfilesActionImpl(formData),
    "Perfiles del docente actualizados correctamente.",
    "No se pudieron actualizar los perfiles del docente."
  );
}

export async function updateTeacherMaxHoursAction(formData: FormData) {
  return updateTeacherMaxHoursActionImpl(formData);
}

export async function updateTeacherMaxHoursFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => updateTeacherMaxHoursActionImpl(formData),
    "Horas maximas actualizadas correctamente.",
    "No se pudieron actualizar las horas maximas."
  );
}

export async function createCustomScheduleBlockAction(formData: FormData) {
  return createCustomScheduleBlockActionImpl(formData);
}

export async function createCustomScheduleBlockStateAction(_previousState: ActionState, formData: FormData) {
  return runFeedbackAction(
    () => createCustomScheduleBlockActionImpl(formData),
    "Bloque personalizado creado correctamente.",
    "No se pudo crear el bloque personalizado."
  );
}

export async function setTeacherActiveAction(formData: FormData) {
  return setTeacherActiveActionImpl(formData);
}

export async function setTeacherActiveFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => setTeacherActiveActionImpl(formData),
    "Estado del docente actualizado correctamente.",
    "No se pudo cambiar el estado del docente."
  );
}

export async function createSubjectAction(formData: FormData) {
  return createSubjectActionImpl(formData);
}

export async function createSubjectStateAction(_previousState: ActionState, formData: FormData) {
  return runFeedbackAction(() => createSubjectActionImpl(formData), "Materia guardada correctamente.", "No se pudo guardar la materia.");
}

export async function updateSubjectAction(formData: FormData) {
  return updateSubjectActionImpl(formData);
}

export async function updateSubjectFeedbackAction(formData: FormData) {
  return runFeedbackAction(() => updateSubjectActionImpl(formData), "Materia actualizada correctamente.", "No se pudo actualizar la materia.");
}

export async function setSubjectActiveAction(formData: FormData) {
  return setSubjectActiveActionImpl(formData);
}

export async function setSubjectActiveFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => setSubjectActiveActionImpl(formData),
    "Estado de la materia actualizado correctamente.",
    "No se pudo cambiar el estado de la materia."
  );
}

export async function assignCoordinatorCareerAction(formData: FormData) {
  return assignCoordinatorCareerActionImpl(formData);
}

export async function assignCoordinatorCareerFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => assignCoordinatorCareerActionImpl(formData),
    "Carrera asignada correctamente.",
    "No se pudo asignar la carrera."
  );
}

export async function assignCoordinatorTeacherAction(formData: FormData) {
  return assignCoordinatorTeacherActionImpl(formData);
}

export async function assignCoordinatorTeacherFeedbackAction(formData: FormData) {
  return runFeedbackAction(
    () => assignCoordinatorTeacherActionImpl(formData),
    "Docente asignado correctamente.",
    "No se pudo asignar el docente."
  );
}

export async function setGroupDraftAction(formData: FormData) {
  return setGroupDraftActionImpl(formData);
}

export async function setGroupReviewAction(formData: FormData) {
  return setGroupReviewActionImpl(formData);
}

export async function setGroupFinalAction(formData: FormData) {
  return setGroupFinalActionImpl(formData);
}

export async function setGroupArchivedAction(formData: FormData) {
  return setGroupArchivedActionImpl(formData);
}

export async function setGroupDraftStateAction(previousState: ActionState, formData: FormData) {
  try {
    await setGroupDraftActionImpl(formData);
    return { success: true, message: "Grupo enviado a borrador.", timestamp: Date.now() };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "No se pudo cambiar el estado del grupo.", timestamp: Date.now() };
  }
}

export async function setGroupReviewStateAction(previousState: ActionState, formData: FormData) {
  try {
    await setGroupReviewActionImpl(formData);
    return { success: true, message: "Grupo enviado a revision.", timestamp: Date.now() };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "No se pudo cambiar el estado del grupo.", timestamp: Date.now() };
  }
}

export async function setGroupFinalStateAction(previousState: ActionState, formData: FormData) {
  try {
    await setGroupFinalActionImpl(formData);
    return { success: true, message: "Grupo finalizado.", timestamp: Date.now() };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "No se pudo finalizar el grupo.", timestamp: Date.now() };
  }
}

export async function setGroupArchivedStateAction(previousState: ActionState, formData: FormData) {
  try {
    await setGroupArchivedActionImpl(formData);
    return { success: true, message: "Grupo archivado.", timestamp: Date.now() };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "No se pudo archivar el grupo.", timestamp: Date.now() };
  }
}
