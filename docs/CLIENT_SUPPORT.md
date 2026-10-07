# Client support

A client (an organization) reports a problem with the platform from **Client support**, in the
sidebar just above the documentation. The page has an **Open new support ticket** button (a form)
and the **history** of the client's tickets (a shadcn data table).

## What a ticket holds

| Field              | Values / source                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `ticket_number`    | Human reference, shown as `SUP-0042`. Never reused.                                                                          |
| `organization_id`  | The **client id** (an organization is a client).                                                                             |
| `contact_email`    | Account details, copied from the account when the ticket is opened.                                                          |
| `contact_phone`    |                                                                                                                              |
| `plan`             |                                                                                                                              |
| `platform_section` | `campaign_creation`, `analytics`, `inventory`, `player_screen_editor`, `other` (a problem that fits no part of the platform) |
| `type`             | `platform_error` (error in the platform), `platform_slowness`, `other`                                                       |
| `severity`         | `low`, `medium`, `high`, `urgent`                                                                                            |
| `description`      | What happened, 10 to 2000 characters.                                                                                        |
| `state`            | `new` (default), `open`, `on_hold`, `cancelled`, `resolved`                                                                  |
| `resolved_at`      | Set by a trigger when the state becomes `resolved`, cleared if it is reopened.                                               |

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

## Comments on a ticket

A client can comment on a ticket that is already open, and the support team can answer: the
conversation is in the detail window of the ticket (the **View** button, or a click on its row). The
history shows how many comments each ticket holds.

- Every member of the organization reads the whole thread and can add to it.
- A comment has 1 to 2000 characters. **Ctrl+Enter** sends it. A comment being written is not lost by
  closing the window by mistake: it asks first.
- A ticket that is **resolved or cancelled** shows its thread but takes no more comments (the client
  opens a new ticket if the problem is back).
- Table `support_ticket_comments`: `ticket_id`, `organization_id`, `author_id`, `author_name`,
  `author_type` (`client` or `support`), `body`. Members can only **read** it. A comment is added
  through `add_support_ticket_comment(p_ticket_id, p_body)` (`SECURITY DEFINER`, `authenticated`
  only), which takes the author and the organization from the caller's account, never from the
  request, answers a ticket of another organization as if it did not exist, and refuses a flood
  (30 comments per author per hour). A comment also moves the ticket's `updated_at`.
- The API answers `404` (ticket not found), `409` (ticket closed), `400` (bad comment) and `429`
  (too many), with a code in the message (`SUPPORT_TICKET_NOT_FOUND`, `SUPPORT_TICKET_CLOSED`,
  `SUPPORT_INVALID_INPUT`, `SUPPORT_RATE_LIMITED`).

## How the team handles tickets

The client cannot change a ticket's state: the team does it with the service role (Supabase Studio
table editor, or SQL):

```sql
-- Take a ticket
update support_tickets set state = 'open' where ticket_number = 42;
-- Resolve it (resolved_at is filled by the trigger)
update support_tickets set state = 'resolved' where ticket_number = 42;
-- Answer a client: the comment appears in the thread, signed "Support team"
insert into support_ticket_comments (ticket_id, organization_id, author_type, author_name, body)
select id, organization_id, 'support', 'Support', 'We found the cause and are working on a fix.'
from support_tickets where ticket_number = 42;
-- The queue, most pressing first
select ticket_number, severity, state, platform_section, contact_email, plan, created_at
from support_tickets
where state in ('new', 'open', 'on_hold')
order by array_position(array['urgent','high','medium','low'], severity), created_at;
```

## Where things are

| What                       | Where                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Table, RLS, function       | `supabase/migrations/20261005120000_create_support_tickets.sql`                         |
| Comments, `other` section  | `supabase/migrations/20261007120000_support_ticket_comments_and_other_section.sql`      |
| Choices, labels, checks    | `src/lib/support.ts`                                                                    |
| Create (RPC)               | `src/services/supportService.ts`                                                        |
| Read the history, a thread | `src/hooks/useSupportTickets.ts`, `src/hooks/useSupportComments.ts`                     |
| Page, form, detail         | `src/components/support/`                                                               |
| Route and sidebar entry    | `/support`: `src/dashboard/pages/SupportPage.tsx`, `src/dashboard/DashboardSidebar.tsx` |
| shadcn building blocks     | `src/components/ui/` (`data-table`, `dialog`, `native-select`, `textarea`, ...)         |

Deploy order: apply the migrations first, then the front end (the page reads `support_tickets` and
calls `create_support_ticket`).

## Tests

`npm test` runs them with Vitest: the choices and checks (`lib/support.test.ts`), the service
(`services/supportService.test.ts`), the form (`NewSupportTicketDialog.test.tsx`), the page
(`ClientSupport.test.tsx`) and the dialog (`ui/dialog.test.tsx`).

The migration was also run against a local Supabase: creation through the REST API with a member's
JWT, isolation between two organizations, refusal of direct `INSERT`/`UPDATE`/`DELETE`, of `anon`,
of bad inputs and of the 11th ticket in an hour, and the `resolved_at` trigger.
