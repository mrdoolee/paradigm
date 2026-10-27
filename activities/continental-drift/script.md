<!--
임시 원고 — 단계 D(Task 11)에서 바꾼다.

이 파일 고치는 법
- 게임에 나오는 모든 글은 이 파일 한 곳에 있습니다.
- "## @이름" 줄이 한 덩어리의 시작입니다. 이름은 게임이 찾는 열쇠라서 바꾸면 안 됩니다.
- 대화: 줄마다 "id: 말". id는 아래 등장인물 표의 id입니다. 말 하나는 새 쪽에서 시작하고, 길면 자동으로 다음 쪽으로 넘어갑니다(최대 2쪽).
- 선택지(@choice-...): 줄마다 "- 보이는 글 -> @이어질 대화 이름".
- 한 줄(@line-...): 한 줄만 씁니다. 안내 띠(@line-guide-...)는 짧게.
- 정리 페이지(@page-...): 마크다운. 소제목은 ###.
- 고친 뒤 "npm run check:script"로 확인합니다. 틀린 곳은 줄 번호와 함께 알려 줍니다.
-->
# 대륙이동설 원고

## 등장인물

| id | 이름 | 표시 | 초상 |
|---|---|---|---|
| aide | 조수 | 가상 인물 | aide |
| wegener | 알프레트 베게너 | 사료 각색 | - |
| member | 학회 참석자 | 가상 인물 | - |
| narr | | - | - |

## @line-card-title
대륙은 움직였을까?

## @line-card-desc
임시 설명.

## @line-title
대륙은 움직였을까?

## @line-start
눌러서 시작

## @intro
aide: 임시 도입 대사.

## @line-guide-coast
남아메리카를 끌어 아프리카에 붙여 보세요

## @coast-after
aide: 임시 해안선 뒤 대사.

## @fossil-before
aide: 임시 화석 앞 대사.

## @line-guide-fossil
인도와 남극을 끌어 화석 띠를 이어 보세요

## @fossil-after
aide: 임시 화석 뒤 대사.

## @glacier-before
aide: 임시 빙하 앞 대사.

## @line-guide-glacier
오스트레일리아를 끌어 빙하 자국을 이어 보세요

## @glacier-after
aide: 임시 빙하 뒤 대사.

## @mountain-before
aide: 임시 산맥 앞 대사.

## @line-guide-mountain
북쪽 대륙들을 끌어 산맥을 이어 보세요

## @mountain-after
aide: 임시 산맥 뒤 대사.

## @merge-after
aide: 임시 합치기 뒤 대사.

## @debate-arrive
narr: 임시 학회 도착.

## @debate-mechanism-q
member: 임시 질문.

## @choice-debate-mechanism
- 지구가 식으며 줄어서 -> @debate-reply-shrink
- 달과 해가 당기는 힘 -> @debate-reply-tide
- 잘 모르겠다 -> @debate-reply-unsure

## @debate-reply-shrink
member: 임시 반박 하나.

## @debate-reply-tide
member: 임시 반박 둘.

## @debate-reply-unsure
member: 임시 반박 셋.

## @debate-landbridge
member: 임시 육교설.

## @debate-note
aide: 임시 짚기.

## @seafloor-before
aide: 임시 해저 앞.

## @line-guide-stripes
줄무늬 조각을 끌어 해령 반대쪽과 맞춰 보세요

## @seafloor-after
aide: 임시 해저 뒤.

## @ending
aide: 임시 마무리.

## @page-about
### 임시 정리 페이지

[처음부터 다시 하기](/continental-drift/)
[목록으로](/)
