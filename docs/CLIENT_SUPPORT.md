# Client support

A client (an organization) reports a problem with the platform from **Client support**, in the
sidebar just above the documentation. The page has an **Open new support ticket** button (a form)
and the **history** of the client's tickets (a shadcn data table).

## What a ticket holds

| Field              | Values / source                                                                |
| ------------------ | ------------------------------------------------------------------------------ |
| `ticket_number`    | Human reference, shown as `SUP-0042`. Never reused.                            |
| `organization_id`  | The **client id** (an organization is a client).                               |
| `contact_email`    | Account details, copied from the account when the ticket is opened.            |
| `contact_phone`    |                                                                                |
| `plan`             |                                                                                |
| `platform_section` | `campaign_creation`, `analytics`, `inventory`, `player_screen_editor`          |
| `type`             | `platform_error` (error in the platform), `platform_slowness`, `other`         |
| `severity`         | `low`, `medium`, `high`, `urgent`                                              |
| `description`      | What happened, 10 to 2000 characters.                                          |
| `state`            | `new` (default), `open`, `on_hold`, `cancelled`, `resolved`                    |
| `resolved_at`      | Set by a trigger when the state becomes `resolved`, cleared if it is reopened. |

The client types only the section, the type, the severity and the description. The account
details are **never** sent by the browser: the database copies them from the caller's own account,
so the team reads verified data as it was when the ticket was opened (the plan may change later).

## Security

- Row level security is on. A member of an organization can **read** the tickets of that
  organization and nothing else.
- `anon` and `authenticated` have no `INSERT`, `UPDATE` or `DELETE` on the table. A ticket is opened
  only through `create_support_ticket(p_platform_section, p_type, p_severity, p_description)`
  (`SECURITY DEFINER`, `search_path = public`, `EXECUTE` for `authenticated` only).
- The function refuses a flood: **10 tickets per organization per hour**.
- Errors carry a code (`SUPPORT_INVALID_INPUT`, `SUPPORT_RATE_LIMITED`, `SUPPORT_NO_ORGANIZATION`,
  `SUPPORT_UNAUTHENTICATED`); the front maps them to sentences, never showing a raw database message.
- Every role of an organization (owner, admin, manager, viewer) can open and read tickets.

## How the team handles tickets

The client cannot change a ticket's state: the team does it with the service role (Supabase Studio
table editor, or SQL):

```sql
-- Take a ticket
update support_tickets set state = 'open' where ticket_number = 42;
-- Resolve it (resolved_at is filled by the trigger)
update support_tickets set state = 'resolved' where ticket_number = 42;
-- The queue, most pressing first
select ticket_number, severity, state, platform_section, contact_email, plan, created_at
from support_tickets
where state in ('new', 'open', 'on_hold')
order by array_position(array['urgent','high','medium','low'], severity), created_at;
```

## Where things are

| What                    | Where                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Table, RLS, function    | `supabase/migrations/20261005120000_create_support_tickets.sql`                         |
| Choices, labels, checks | `src/lib/support.ts`                                                                    |
| Create (RPC)            | `src/services/supportService.ts`                                                        |
| Read the history        | `src/hooks/useSupportTickets.ts`                                                        |
| Page, form, detail      | `src/components/support/`                                                               |
| Route and sidebar entry | `/support`: `src/dashboard/pages/SupportPage.tsx`, `src/dashboard/DashboardSidebar.tsx` |
| shadcn building blocks  | `src/components/ui/` (`data-table`, `dialog`, `native-select`, `textarea`, ...)         |

Deploy order: apply the migration first, then the front end (the page reads `support_tickets` and
calls `create_support_ticket`).

## Tests

`npm test` runs them with Vitest: the choices and checks (`lib/support.test.ts`), the service
(`services/supportService.test.ts`), the form (`NewSupportTicketDialog.test.tsx`), the page
(`ClientSupport.test.tsx`) and the dialog (`ui/dialog.test.tsx`).

The migration was also run against a local Supabase: creation through the REST API with a member's
JWT, isolation between two organizations, refusal of direct `INSERT`/`UPDATE`/`DELETE`, of `anon`,
of bad inputs and of the 11th ticket in an hour, and the `resolved_at` trigger.
