# double-tree_demo

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-rys7bzcs)

## Room operations and housekeeping

Apply the pending Supabase migrations, including
`supabase/migrations/20260926000000_008_room_operations.sql`, before using the
room board. For a linked project, run `supabase db push`. Enable **Anonymous
Sign-Ins** in the hosted project's Authentication settings; local Supabase uses
the equivalent setting in `supabase/config.toml`.

Guest and demo staff sign-ins establish a per-tab Supabase identity. Database
functions validate the existing guest PIN or demo staff password and attach that
identity to the guest stay or staff profile. RLS then scopes requests, rooms,
tasks, and realtime changes to that identity and hotel.

The room board is at `/staff/rooms`; the mobile housekeeping work queue is at
`/staff/housekeeping`. Demo staff use `staff` through `staff5` with password
`staff123`; the manager uses `manager` with password `manager123`. All five
staff retain their Food & Beverage primary department. Maria is separately
authorized for housekeeping duties so the room workflow does not change the
existing department assignments.
