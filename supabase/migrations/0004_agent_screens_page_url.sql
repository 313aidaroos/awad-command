-- Optional page_url on agent_screens so the hub can skip about:blank "latest" frames
-- when an earlier screenshot in the same task still has content.

alter table awad_command.agent_screens
  add column if not exists page_url text;
