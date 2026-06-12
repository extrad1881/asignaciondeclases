"use server";

import {
  assignCoordinatorCareerAction as assignCoordinatorCareerActionImpl,
  assignCoordinatorTeacherAction as assignCoordinatorTeacherActionImpl,
  createAssignmentAction as createAssignmentActionImpl,
  createCustomScheduleBlockAction as createCustomScheduleBlockActionImpl,
  createGroupAction as createGroupActionImpl,
  createSubjectAction as createSubjectActionImpl,
  createTeacherAction as createTeacherActionImpl,
  createUserAction as createUserActionImpl,
  deleteAssignmentAction as deleteAssignmentActionImpl,
  deleteCoordinatorRecordAction as deleteCoordinatorRecordActionImpl,
  deleteGroupAction as deleteGroupActionImpl,
  setSubjectActiveAction as setSubjectActiveActionImpl,
  setTeacherActiveAction as setTeacherActiveActionImpl,
  updateAssignmentAction as updateAssignmentActionImpl,
  updateCoordinatorCareersAction as updateCoordinatorCareersActionImpl,
  updateCoordinatorRecordAction as updateCoordinatorRecordActionImpl,
  updateCoordinatorUserAction as updateCoordinatorUserActionImpl,
  updateSubjectAction as updateSubjectActionImpl,
  updateTeacherMaxHoursAction as updateTeacherMaxHoursActionImpl,
  updateTeacherProfilesAction as updateTeacherProfilesActionImpl,
  updateUserAction as updateUserActionImpl
} from "./actions/legacy";

export async function createGroupAction(formData: FormData) {
  return createGroupActionImpl(formData);
}

export async function createAssignmentAction(formData: FormData) {
  return createAssignmentActionImpl(formData);
}

export async function updateAssignmentAction(formData: FormData) {
  return updateAssignmentActionImpl(formData);
}

export async function deleteAssignmentAction(formData: FormData) {
  return deleteAssignmentActionImpl(formData);
}

export async function deleteGroupAction(formData: FormData) {
  return deleteGroupActionImpl(formData);
}

export async function createUserAction(formData: FormData) {
  return createUserActionImpl(formData);
}

export async function updateUserAction(formData: FormData) {
  return updateUserActionImpl(formData);
}

export async function updateCoordinatorUserAction(formData: FormData) {
  return updateCoordinatorUserActionImpl(formData);
}

export async function updateCoordinatorRecordAction(formData: FormData) {
  return updateCoordinatorRecordActionImpl(formData);
}

export async function deleteCoordinatorRecordAction(formData: FormData) {
  return deleteCoordinatorRecordActionImpl(formData);
}

export async function updateCoordinatorCareersAction(formData: FormData) {
  return updateCoordinatorCareersActionImpl(formData);
}

export async function createTeacherAction(formData: FormData) {
  return createTeacherActionImpl(formData);
}

export async function updateTeacherProfilesAction(formData: FormData) {
  return updateTeacherProfilesActionImpl(formData);
}

export async function updateTeacherMaxHoursAction(formData: FormData) {
  return updateTeacherMaxHoursActionImpl(formData);
}

export async function createCustomScheduleBlockAction(formData: FormData) {
  return createCustomScheduleBlockActionImpl(formData);
}

export async function setTeacherActiveAction(formData: FormData) {
  return setTeacherActiveActionImpl(formData);
}

export async function createSubjectAction(formData: FormData) {
  return createSubjectActionImpl(formData);
}

export async function updateSubjectAction(formData: FormData) {
  return updateSubjectActionImpl(formData);
}

export async function setSubjectActiveAction(formData: FormData) {
  return setSubjectActiveActionImpl(formData);
}

export async function assignCoordinatorCareerAction(formData: FormData) {
  return assignCoordinatorCareerActionImpl(formData);
}

export async function assignCoordinatorTeacherAction(formData: FormData) {
  return assignCoordinatorTeacherActionImpl(formData);
}
