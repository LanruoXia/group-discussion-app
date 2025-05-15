create table public.evaluation (
  id uuid not null default gen_random_uuid (),
  participant text not null,
  pronunciation_delivery_score integer not null,
  pronunciation_delivery_comment text not null,
  communication_strategies_score integer not null,
  communication_strategies_comment text not null,
  vocabulary_patterns_score integer not null,
  vocabulary_patterns_comment text not null,
  ideas_organization_score integer not null,
  ideas_organization_comment text not null,
  user_id uuid null,
  session_id uuid null,
  speaking_time integer null,
  word_count integer null,
  constraint evaluation_pkey primary key (id),
  constraint evaluation_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint evaluation_user_id_fkey foreign KEY (user_id) references profiles (id),
  constraint evaluation_vocabulary_patterns_score_check check (
    (
      (vocabulary_patterns_score >= 0)
      and (vocabulary_patterns_score <= 7)
    )
  ),
  constraint evaluation_pronunciation_delivery_score_check check (
    (
      (pronunciation_delivery_score >= 0)
      and (pronunciation_delivery_score <= 7)
    )
  ),
  constraint evaluation_ideas_organization_score_check check (
    (
      (ideas_organization_score >= 0)
      and (ideas_organization_score <= 7)
    )
  ),
  constraint evaluation_communication_strategies_score_check check (
    (
      (communication_strategies_score >= 0)
      and (communication_strategies_score <= 7)
    )
  )
) TABLESPACE pg_default;

create table public.merged_transcripts (
  id uuid not null default gen_random_uuid (),
  session_id uuid not null,
  merged_transcript text not null,
  created_at timestamp with time zone not null default now(),
  constraint merged_transcripts_pkey primary key (id),
  constraint merged_transcripts_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger evaluate
after INSERT on merged_transcripts for EACH row
execute FUNCTION supabase_functions.http_request (
  'https://group-discussion-app.vercel.app/api/webhook/evaluate',
  'POST',
  '{"Content-type":"application/json"}',
  '{}',
  '10000'
);

create table public.participants (
  id uuid not null default extensions.uuid_generate_v4 (),
  created_at timestamp with time zone null default now(),
  session_id uuid not null,
  user_id uuid null,
  is_ai boolean not null default false,
  ai_prompt text null,
  username text null,
  ready boolean null default false,
  agora_uid bigint null,
  constraint participants_pkey primary key (id),
  constraint participants_session_id_user_id_key unique (session_id, user_id),
  constraint participants_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint participants_user_id_fkey foreign KEY (user_id) references auth.users (id) deferrable initially DEFERRED,
  constraint check_ai_user_id check (
    (
      (
        (is_ai = true)
        and (user_id is null)
      )
      or (
        (is_ai = false)
        and (user_id is not null)
      )
    )
  )
) TABLESPACE pg_default;

create trigger start_discussion
after
update on participants for EACH row
execute FUNCTION supabase_functions.http_request (
  'https://group-discussion-app.vercel.app/api/webhook/start-discussion',
  'POST',
  '{"Content-type":"application/json"}',
  '{}',
  '10000'
);

create table public.profiles (
  id uuid not null,
  username text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  name text null,
  school text null,
  grade text null,
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger on_profiles_updated BEFORE
update on profiles for EACH row
execute FUNCTION handle_updated_at ();

create table public.prompt (
  id uuid not null default gen_random_uuid (),
  test_topic text not null,
  content text not null,
  created_at timestamp with time zone null default now(),
  constraint prompt_pkey primary key (id)
) TABLESPACE pg_default;

create table public.rubric (
  id uuid not null default gen_random_uuid (),
  content text not null,
  created_at timestamp with time zone null default now(),
  constraint rubric_pkey primary key (id)
) TABLESPACE pg_default;

create table public.sessions (
  id uuid not null default extensions.uuid_generate_v4 (),
  created_at timestamp with time zone null default now(),
  created_by uuid not null,
  status text null default 'waiting'::text,
  ai_count integer not null default 0,
  session_code text not null,
  instructions text null,
  test_topic text not null,
  expires_at timestamp with time zone null,
  preparation_start_time timestamp with time zone null,
  discussion_start_time timestamp with time zone null,
  transcript_merged boolean null default false,
  cloud_recording_resource_id text null,
  cloud_recording_sid text null,
  individual_recording_resource_id text null,
  individual_recording_sid text null,
  constraint sessions_pkey primary key (id),
  constraint sessions_session_code_key unique (session_code),
  constraint sessions_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint sessions_status_check check (
    (
      status = any (
        array[
          'waiting'::text,
          'preparation'::text,
          'ready'::text,
          'discussion'::text,
          'evaluation'::text,
          'completed'::text,
          'expired'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create table public.transcripts (
  id uuid not null default gen_random_uuid (),
  session_id uuid not null,
  user_id uuid not null,
  transcript jsonb not null,
  start_at timestamp with time zone not null,
  constraint transcripts_pkey primary key (id),
  constraint transcripts_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint transcripts_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger on_transcript_submit
after INSERT on transcripts for EACH row
execute FUNCTION supabase_functions.http_request (
  'https://group-discussion-app.vercel.app/api/webhook/merge-transcript',
  'POST',
  '{"Content-type":"application/json"}',
  '{}',
  '5000'
);
