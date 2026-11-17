# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the label strings used in
`midnightntwrk/platform-js`.

Labels are IaC-managed and the org forbids bare labels outside a grandfathered set, so the skills' defaults
(`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`) must never be created here.

| Label in mattpocock/skills | Label in our tracker | Meaning                                                       |
| -------------------------- | -------------------- | ------------------------------------------------------------- |
| `needs-triage`             | `status:untriaged`   | Maintainer needs to evaluate this issue                       |
| `needs-info`               | `question`           | Waiting on reporter for more information                      |
| `ready-for-agent`          | _none_               | Not used: never apply or create a label, nor one in its place |
| `ready-for-human`          | _none_               | Not used: never apply or create a label, nor one in its place |
| `wontfix`                  | `wontfix`            | Will not be actioned                                          |

When a skill mentions a role, use the corresponding label string from this table.

An issue holds one triage role at a time. When moving an issue to a new role, remove the previous role's label,
whatever its prefix (`status:untriaged`, `question` or `wontfix`).
