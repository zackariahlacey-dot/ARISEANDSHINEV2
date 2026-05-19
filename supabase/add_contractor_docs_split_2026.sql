-- Split the single Independent Contractor Agreement into THREE focused
-- e-signature documents — one for each of the themes the contractor needs
-- to consent to separately:
--
--   payment       — how they get paid, tips, taxes, expenses
--   restrictions  — non-solicit, non-compete, confidentiality, conduct
--   liability     — damage liability, insurance, indemnification, safety
--
-- Each contractor will end up with three rows in contractor_agreements once
-- onboarded. Existing signed rows (if any) keep their default 'master'
-- value so we never invalidate a signature already on file.

alter table contractor_agreements
  add column if not exists doc_kind text not null default 'master';

-- One active signed copy per (contractor, kind). Re-signing supersedes.
drop index if exists ux_contractor_agreements_kind;
create unique index if not exists ux_contractor_agreements_kind
  on contractor_agreements (contractor_id, doc_kind)
  where status = 'signed';

-- Onboarding is "complete" when all three documents are signed. Helper view
-- so admin queries don't have to repeat the join.
create or replace view contractor_onboarding_progress as
  select
    p.id                                         as contractor_id,
    p.first_name,
    p.last_name,
    p.email,
    p.employment_status,
    count(a.id) filter (where a.status = 'signed' and a.doc_kind in ('payment','restrictions','liability')) as docs_signed,
    bool_and(a.doc_kind is not null)             as has_any_signed,
    (
      count(distinct a.doc_kind) filter (where a.status = 'signed' and a.doc_kind in ('payment','restrictions','liability')) = 3
    )                                            as fully_onboarded
  from profiles p
  left join contractor_agreements a
    on a.contractor_id = p.id
  where p.role = 'contractor'
  group by p.id, p.first_name, p.last_name, p.email, p.employment_status;
