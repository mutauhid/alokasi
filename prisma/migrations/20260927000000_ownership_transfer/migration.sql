BEGIN;

ALTER TABLE app.memberships
  ADD CONSTRAINT memberships_workspace_id_id_key UNIQUE (workspace_id, id);

ALTER TABLE app.workspaces
  ADD COLUMN ownership_transfer_to_membership_id UUID,
  ADD COLUMN ownership_transfer_requested_at TIMESTAMPTZ(3),
  ADD COLUMN ownership_transfer_expires_at TIMESTAMPTZ(3);

ALTER TABLE app.workspaces
  ADD CONSTRAINT workspace_ownership_transfer_shape CHECK (
    (
      ownership_transfer_to_membership_id IS NULL
      AND ownership_transfer_requested_at IS NULL
      AND ownership_transfer_expires_at IS NULL
    )
    OR
    (
      type = 'shared'
      AND ownership_transfer_to_membership_id IS NOT NULL
      AND ownership_transfer_requested_at IS NOT NULL
      AND ownership_transfer_expires_at IS NOT NULL
      AND ownership_transfer_expires_at > ownership_transfer_requested_at
    )
  ),
  ADD CONSTRAINT workspace_ownership_transfer_membership_fkey
    FOREIGN KEY (id, ownership_transfer_to_membership_id)
    REFERENCES app.memberships(workspace_id, id)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

COMMIT;
