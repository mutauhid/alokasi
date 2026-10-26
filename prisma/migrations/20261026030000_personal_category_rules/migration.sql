BEGIN;

CREATE TABLE app.personal_category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  keyword varchar(60) NOT NULL,
  keyword_key varchar(100) NOT NULL,
  category_id uuid NOT NULL,
  type app."TransactionType" NOT NULL DEFAULT 'expense',
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT personal_category_rules_workspace_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES app.workspaces(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT personal_category_rules_membership_fkey
    FOREIGN KEY (workspace_id, user_id)
    REFERENCES app.memberships(workspace_id, user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT personal_category_rules_category_fkey
    FOREIGN KEY (workspace_id, category_id, type)
    REFERENCES app.categories(workspace_id, id, type)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT personal_category_rules_expense_only
    CHECK (type = 'expense')
);

CREATE UNIQUE INDEX personal_category_rules_workspace_user_keyword_key
  ON app.personal_category_rules(workspace_id, user_id, keyword_key);
CREATE INDEX personal_category_rules_workspace_user_idx
  ON app.personal_category_rules(workspace_id, user_id);
CREATE INDEX personal_category_rules_workspace_category_idx
  ON app.personal_category_rules(workspace_id, category_id);

COMMIT;
