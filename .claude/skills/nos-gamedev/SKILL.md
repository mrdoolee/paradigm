---
name: nos-gamedev
description: 외부 게임 개발 스킬(awesome-gamedev-agent-skills에서 가져온 router·phaser-core·game-ui-ux·game-feel·dialogue-systems·input-systems·create-game-assets·visual-novel·prototype-fast)을 이 프로젝트에 맞춰 읽는 안내판. Phaser 장면 구성, 대화창·선택지·안내 띠, 끌어 맞추기 조작, 키보드·터치 입력, 움직임 손맛, 그림 제작 절차, 프로토타입을 설계하거나 고칠 때 그 스킬들보다 먼저 읽는다. 원고 문장(→ nos-script), 검증 실행(→ nos-check), 그림 스타일 판정(→ nos-art)에는 쓰지 않는다.
---

# 게임 개발 스킬 묶음 안내판

원본: [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (Apache-2.0). 출처·버전·바꾼 점은 `upstream/PROVENANCE.md`.

이 파일은 **어느 외부 스킬을 언제 읽고, 이 프로젝트에서는 무엇을 다르게 하는지**만 적는다. 외부 스킬 본문은 고치지 않는다. 외부 스킬과 CLAUDE.md·설계 문서(`docs/superpowers/specs/`)가 부딪히면 **CLAUDE.md와 설계 문서가 이긴다.**

## 전제

- 엔진은 **Phaser 4 + TypeScript + Vite**. `router`가 엔진을 못 알아보면(아직 `package.json`이 없을 때) Godot로 넘어가지 말고 Phaser로 본다.
- `router`의 표에 나오는 경로 `skills/<분류>/<이름>/`은 이 저장소에서 `.claude/skills/<이름>/`이다. 설치된 것은 아래 9개뿐이다. 표가 가리키는 다른 스킬(Godot·Unity·save-systems·puzzle 등)은 없으므로 찾지 않는다.
- 원본 예시가 GDScript·C#이면 생각의 틀로만 읽고 TypeScript·Phaser로 옮긴다.

## 어느 스킬을 언제

| 하려는 일 | 읽을 스킬 |
|---|---|
| 무엇을 읽을지 모를 때 | `router` (위 전제와 함께) |
| 게임 설정, 장면 구조, 장면 사이 데이터, 겹치는 UI 장면 | `phaser-core` (+ `references/scene-flow.md`) |
| 대화창·선택지·안내 띠 배치, 화면 크기 대응, 초점 이동 | `game-ui-ux` |
| 대화 진행 구조, 조건, 쪽 넘김 | `dialogue-systems`, `visual-novel` |
| 끌기·키보드·터치 입력, 행동 이름 | `input-systems` |
| 착 붙는 느낌, 짧은 연출, 효과음 타이밍 | `game-feel` |
| 그림 브리프·품질 관문·대조 시트 | `create-game-assets` (스타일 판정은 `nos-art`가 우선) |
| 회색 상자 프로토타입, 계속/수정 결정 | `prototype-fast` |

## 이 프로젝트에서 바꿔 읽기

**phaser-core**
- 화면은 480×360 가상 화면 하나, 정수 배율(기본 2배), `pixelArt: true`. `Scale.FIT`의 소수 배율은 쓰지 않는다(도트가 번진다). 배율은 창 크기에서 직접 계산한다.
- 대화·선택지·안내 띠는 **늘 위에 있는 UI 장면 하나**가 맡는다. `launch`는 한 번만, 그리기 순서는 `bringToTop`. 세계 장면은 대화 때문에 크기·위치가 바뀌지 않는다.
- `this.add.dom`과 HTML 겹치기는 게임 화면에 쓰지 않는다(규칙 검사가 막는다). 정리 페이지만 일반 웹페이지다.

**game-ui-ux**
- 원본의 "앵커·컨테이너로 흐르게"는 고정 가상 화면이라 대부분 해당 없다. 대신 **자리·크기를 상수로 고정**한다(대화창 아래, 선택지 대화창 위 오른쪽, 안내 띠 위쪽).
- 화면 스택(push/pop)은 그대로 쓴다: 대화가 뜨면 세계 입력을 멈추고, 닫히면 돌려준다. 대화 중엔 안내 띠를 숨긴다.
- 안전 영역·TV·휴대폰·게임패드는 해당 없다(PC 1280×800, 태블릿 가로 1024×768).
- 글자 크기 기준: 실제 화면에서 16px 이상(Galmuri11을 2배 = 22px).

**dialogue-systems · visual-novel**
- Ink·Yarn은 쓰지 않는다. 원고는 `activities/<id>/script.md` 한 곳(`nos-script`).
- "글을 한 번 배치하고 넘치면 쪽을 넘긴다"는 그대로 쓴다. 줄 바꿈 계산은 원고 검사와 실행이 같은 함수를 쓴다.
- 되읽기(backlog)·자동 넘김·건너뛰기·세이브는 넣지 않는다(14분짜리, 설계 비목표). 넘김 표시 ▼와 쪽 번호는 넣는다.
- 선택지는 정답이 없다. 무엇을 골라도 다음으로 간다(교육 규칙).

**input-systems**
- 행동 이름으로 추상화한다(`confirm`, `cancel`, `next`, `move`). 장면 코드가 키를 직접 읽지 않는다.
- 게임패드·키 다시 묶기·데드존·코요테 타임은 쓰지 않는다. 마우스·터치 끌기 + 키보드(방향키·Enter·Esc·Tab)만.

**game-feel**
- 쓸 것: 착 붙을 때 짧게 끊어 움직이는 연출(칸 단위 몇 단계), 단계 완료 때 짧은 반짝임, 효과음(처음엔 꺼짐).
- 쓰지 않을 것: 화면 흔들기, 히트스톱, 넉백, 부드러운 보간(도트가 번진다). 깜박임 접근성 기준(초당 3회 이하)을 지킨다.

**create-game-assets**
- 판정·순서는 `nos-art`(STYLE.md → 견본 → 대량). 이 스킬은 브리프 항목·품질 관문 점검표와 `scripts/build_preview_sheet.py`(대조 시트)로 쓴다. 파이썬은 sprite-gen 가상환경의 것을 쓴다(Pillow 있음).
- 대륙은 실제 지도(퍼블릭 도메인 해안선)로 만든 윤곽 마스크를 참고 이미지로 넣어 생성하고, 생성 뒤 같은 마스크로 잘라 윤곽을 지킨다(설계 5절). 정답 좌표도 그 마스크 기준이다.

**prototype-fast**
- 첫 구현 단계에 쓴다. 질문은 하나: "대륙 끌어 맞추기가 재미있고 14분 안에 들어가나?" 회색 상자, 원고 없음, 테스트 최소. 결과는 사용자가 직접 해 보고 계속/수정을 정한다.
- 프로토타입 코드를 그대로 이어 쓸지는 그때 다시 정한다(그대로 쓰면 테스트를 붙인다).

## 업데이트

원본이 바뀌면 같은 9개 폴더만 다시 받아 덮어쓰고, 각 SKILL.md 설명 끝 문장("In this repo read the nos-gamedev skill first …")과 본문 첫 줄 주석을 다시 넣는다. `agents/` 폴더(Codex 전용)는 빼고 넣는다. `upstream/PROVENANCE.md`의 커밋을 고친다.
