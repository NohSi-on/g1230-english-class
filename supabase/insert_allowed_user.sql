-- 사용자 허용 목록에 본인 이메일 추가
-- 이 스크립트를 Supabase SQL Editor에서 실행(Run)하세요.

insert into allowed_users (email, role)
values ('osang1230@gmail.com', 'admin')
on conflict (email) do nothing;

-- 만약 다른 구글 계정을 사용하신다면 위 이메일을 수정해주세요.
