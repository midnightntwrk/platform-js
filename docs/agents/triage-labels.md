# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the label strings used in
`midnightntwrk/platform-js`.

Labels are IaC-managed and the org forbids bare labels outside a grandfathered set, so the skills' defaults
(`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`) must never be created here.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `status:untriaged`   | Maintainer needs to evaluate this issue  |
| `needs-info`               | `question`           | Waiting on reporter for more information |
| `ready-for-agent`          | _none_               | Not used in this repo                    |
| `ready-for-human`          | _none_               | Not used in this repo                    |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this
table.

## Roles not used

This repo doesn't use `ready-for-agent` or `ready-for-human`. Never apply or create a label for them, and don't apply
any other label in their place.

`status:*` labels are mutually exclusive: when moving an issue to a new role, remove the previous `status:*` label.
