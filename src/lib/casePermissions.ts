interface CanEditCaseParams {
  isAdmin?: boolean;
  isMasterAdmin: boolean;
  createdBy?: string | null;
  userId?: string | null;
}

interface IsRubricEditableParams {
  canEdit: boolean;
  isEditing: boolean;
}

export const canEditCase = ({ isAdmin, isMasterAdmin, userId }: CanEditCaseParams) =>
  !!userId && (isMasterAdmin || isAdmin === true);

export const canDeleteCase = ({ isMasterAdmin, createdBy, userId }: CanEditCaseParams) =>
  !!userId && (isMasterAdmin || (!!createdBy && createdBy === userId));

export const isRubricEditable = ({ canEdit, isEditing }: IsRubricEditableParams) =>
  canEdit && isEditing;
