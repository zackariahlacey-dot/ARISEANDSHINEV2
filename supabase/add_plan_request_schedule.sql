-- Add recurring schedule fields to plan_requests

alter table plan_requests
  add column if not exists schedule_preference text
    check (schedule_preference in ('monthly_pick', 'fixed_day')),
  add column if not exists fixed_day_of_week   int,  -- 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri
  add column if not exists fixed_week_of_month int,  -- 1=1st 2=2nd 3=3rd 4=4th
  add column if not exists schedule_confirmed_at timestamptz;
