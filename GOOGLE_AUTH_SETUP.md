# Google 로그인 설정 가이드 (Google OAuth Setup)

**🚨 현재 문제점**: Supabase 대시보드 스크린샷에서 `Client ID` 칸에 본인의 이메일(`osang1230@gmail.com`)이 입력되어 있습니다. 이는 잘못된 설정이며, Google Cloud에서 발급받은 **긴 코드**가 필요합니다.

아래 순서대로 진행하여 올바른 ID와 Secret을 발급받으세요.

---

## 1단계: Google Cloud Console 접속
1. [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials) 페이지로 이동합니다.
2. 상단에서 **프로젝트 선택**을 누르고, **"새 프로젝트(New Project)"**를 클릭해 프로젝트를 하나 만듭니다 (이름: `G1230 English` 등 자유).

## 2단계: OAuth 동의 화면 (Consent Screen) 설정
1. 좌측 메뉴 **"OAuth 동의 화면(OAuth consent screen)"** 클릭.
2. **User Type**을 **"외부(External)"**로 선택하고 만들기 클릭.
3. 앱 이름, 사용자 지원 이메일, 개발자 연락처 정보만 입력하고 **저장 후 계속**.
4. **테스트 사용자(Test users)** 단계에서 **"ADD USERS"** 버튼을 클릭하고, **본인의 구글 이메일(`osang1230@gmail.com`)을 추가**합니다. (이 과정을 건너뛰면 로그인이 안 됩니다!)
5. 저장 후 완료.

## 3단계: Client ID 발급
1. 좌측 메뉴 **"사용자 인증 정보(Credentials)"** 클릭.
2. 상단 **"+ 사용자 인증 정보 만들기(+ CREATE CREDENTIALS)"** > **"OAuth 클라이언트 ID(OAuth client ID)"** 선택.
3. 애플리케이션 유형: **"웹 애플리케이션(Web application)"** 선택.
4. **승인된 자바스크립트 원본 (Authorized JavaScript origins)**:
   - `http://localhost:5174` 추가
5. **승인된 리디렉션 URI (Authorized redirect URIs)**: 
   - **가장 중요합니다!** Supabase 대시보드에서 `Authentication` > `Providers` > `Google` 화면에 있는 **`Callback URL (for OAuth)`** 값을 복사해서 여기에 붙여넣으세요.
   - 예시: `https://onyirgrejsentmefyfkv.supabase.co/auth/v1/callback`
6. **만들기(CREATE)** 클릭.

## 4단계: Supabase에 정보 입력
1. Google Cloud에서 발급된 **"클라이언트 ID (Client ID)"**와 **"클라이언트 보안 비밀번호 (Client Secret)"** 창이 뜰 것입니다.
2. 이 두 값을 복사합니다.
3. **Supabase 대시보드** > `Authentication` > `Providers` > `Google` 로 돌아갑니다.
4. 기존에 잘못 입력된 이메일을 지우고, 복사한 **Client ID**를 붙여넣습니다.
5. **Client Secret**도 붙여넣습니다.
6. **Enable Sign in with Google** 스위치를 **ON**으로 켭니다.
7. **Save** 버튼을 누릅니다.

## 5단계: 로컬 테스트 주소 허용 (Supabase)
1. Supabase 대시보드 > `Authentication` > `URL Configuration` 메뉴로 이동합니다.
2. **Redirect URLs** 섹션에 `http://localhost:5174/**` 혹은 `http://localhost:5174` 을 추가하고 저장합니다. (필수!)

이제 로그인 페이지에서 구글 로그인을 시도해보세요!
