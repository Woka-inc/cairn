# 설정

[English](configuration.md) · 한국어

[README](../README.ko.md)로 돌아가기.

## 명령

```
cairn build [--config cairn.config.json] [--if-stale] [--quiet]
cairn check [--config cairn.config.json]
cairn guide [--config cairn.config.json] [--write FILE]
cairn init  <kb-folder> [--config cairn.config.json] [--write] [--force]
cairn watch [--config cairn.config.json]
```

실행은 `node path/to/cairn/bin/cairn.mjs <command>` 형태로 합니다.

| 명령 | 설명 |
|---|---|
| `build` | 노트를 읽고, 그래프를 펼치고, 모든 파일을 렌더링하고, 크기 목표를 검사합니다. 결과는 옆에 만든 임시 폴더에 먼저 써서 검증하고, 그다음에야 제자리로 바꿔 넣습니다. 끝나면 개수와 함께 실제 크기(가장 큰 카드, `CATALOG.md`, `INDEX.md`)를 목표와 나란히 출력합니다. 카드, 표, 색인 가운데 하나라도 목표를 넘으면 빌드가 실패하고, 넘은 파일과 넘은 바이트 수를 하나씩 적고, 이전 볼트는 그대로 남깁니다. `--if-stale`을 주면 지문이 그대로일 때 빌드를 건너뜁니다. |
| `check` | 읽기만 합니다. 설정이 올바른지, 지문이 현재 입력과 맞는지, 모든 파일이 새로 빌드한 결과와 바이트 단위로 같은지, 크기 목표를 지켰는지(실제 크기도 함께), 노드마다 카드 한 장과 표 한 행이 있는지, `wayfinding.instructionFile`을 정했다면 그 파일에 최신 블록이 들어 있는지 확인합니다. 문제가 하나라도 있으면 1로 끝납니다. |
| `guide` | 길 안내 블록을 출력합니다. `--write FILE`을 주면 블록을 `<!-- cairn:wayfinding:start -->`와 `<!-- cairn:wayfinding:end -->` 사이에 넣습니다(기존 블록이 있으면 바꾸고, 없으면 끝에 붙입니다). 블록 안의 경로는 `FILE` 기준입니다. 볼트가 낡았으면 경고하고, 노트(`source.dir` 안에서 id가 있는 파일)에는 쓰지 않고 거부합니다. |
| `init` | 폴더를 훑어 설정 초안을 제안합니다. id·제목·설명 필드, `source.exclude`(에이전트 지침 파일, README, id 필드가 없는 파일), 종류 필드, 연결 필드(값이 노드 id로 풀리는 필드), 속성(값의 종류가 적은 필드), 카드 필드, 공유 중간 노드로 쓸 연결을 고릅니다. 전체에서는 드물어도 한 종류 안에서는 빠짐없이 있는 필드(예: 설계 문서마다 있는 `status`)도 제안하고, 종류별로 몇 %에 있는지 보고에 적습니다. `--config`는 초안이 어느 설정 파일용인지 정합니다(`source.dir`은 그 파일의 폴더 기준). `--write`가 없으면 JSON을 출력합니다. |
| `watch` | `source.dir` 아래 파일이나 설정이 바뀌면 다시 빌드합니다. |

종료 코드: 0 정상, 1 실패, 2 사용법·설정 오류, 4 다른 빌드가 잠금을 잡고 있음.

## 설정 파일과 볼트를 둘 곳

설정 안의 경로는 모두 설정 파일이 있는 폴더를 기준으로 풉니다. `source.dir`은 노트가 든 폴더이고, `output`은 볼트 폴더입니다(기본 `cairn-vault`, 설정 파일 옆).

- **노트가 하위 폴더에 있을 때**(예: 프로젝트 안의 `notes/`): 설정 파일을 프로젝트 루트에 두고 `"source": { "dir": "notes" }`로 정합니다. 볼트는 노트 폴더 옆에 생깁니다.
- **저장소 전체가 노트일 때**: 설정 파일을 저장소 한 단계 위, 저장소 옆에 두면 볼트가 저장소 밖에 생깁니다. 설정 파일을 루트에 두고 `"source": { "dir": "." }`로 정하면 볼트가 노트 폴더 안의 하위 폴더가 됩니다. Cairn은 자기 출력을 입력에서 빼지만, 노트를 읽는 다른 도구(예: Obsidian)에는 볼트가 보이므로 그 도구에서 제외하고, `.gitignore`도 정하세요([아래](#볼트-갱신)).
- `output`을 노트 폴더 자체나 노트 폴더를 품은 폴더로 정하면 안 됩니다. 빌드는 출력 폴더를 통째로 바꾸기 때문입니다. 이렇게 정하면 오류 메시지가 위의 방법을 알려 줍니다.
- `wayfinding.instructionFile`에 에이전트 지침 파일을 설정 파일 기준 경로로 넣으세요. 블록 안의 경로가 그 파일 기준으로 적히고, 노트 폴더 안에 있어도 노트로 읽지 않으며, `check`가 그 파일에 최신 블록이 들어 있는지 확인합니다.

## 설정 항목

설정 파일은 `cairn.config.json`입니다. 상대 경로는 설정 파일이 있는 폴더를 기준으로 풉니다. 모르는 키는 거부하고(비슷한 키를 제안합니다), 문제가 여럿이면 한 번에 모두 알려 줍니다.

```json
{
  "source": { "dir": "kb", "include": ["**/*.md"], "exclude": ["README.md"] },
  "idField": "id",
  "titleField": "title",
  "descriptionField": "summary",
  "kindField": "kind",
  "attributes": ["kind", "layer", "stability", "language", "owner", "status"],
  "edges": [
    { "field": "depends_on", "label": "Depends on", "reverse": "Used by" },
    { "field": "related", "label": "Related", "reverse": "Related from" },
    { "field": "design_docs", "label": "Design docs", "reverse": "Cited by" }
  ],
  "sharedNeighbors": { "via": "design_docs", "label": "Shares design docs with" },
  "k": 10,
  "card": { "fields": ["goal", "decision"], "headings": true, "maxBytes": 5120 },
  "catalog": { "maxBytes": 20480 },
  "output": "cairn-vault",
  "wayfinding": { "instructionFile": "AGENTS.md" }
}
```

| 키 | 기본값 | 뜻 |
|---|---|---|
| `$comment` | 없음 | 설정에 남길 메모. 문자열 하나나 문자열 목록으로 적습니다. Cairn은 읽지 않고, 지문에도 넣지 않습니다. |
| `source.dir` | 필수 | 지식 베이스 폴더. `output`이 이 폴더의 하위 폴더인 것은 괜찮지만, 이 폴더 자체이거나 이 폴더를 품으면 안 됩니다. |
| `source.include` | `["**/*.md"]` | 노드 파일을 고르는 glob(`*`, `**`, `?`). `source.dir` 기준입니다. 점으로 시작하는 폴더, Cairn의 출력 폴더, `wayfinding.instructionFile`은 항상 건너뜁니다. |
| `source.exclude` | `[]` | 뺄 파일의 glob(README, 템플릿, 초안). |
| `idField` | `"id"` | 노드 id가 든 front matter 필드. `"$filename"`이면 확장자를 뺀 파일 이름을 씁니다. id가 없는 파일은 노드가 아닙니다. 경고와 함께 건너뛰고 지문에도 넣지 않으므로, `source.dir` 안의 README나 지침 파일을 고쳐도 볼트가 낡지 않습니다. id가 겹치면 빌드가 실패합니다. |
| `titleField` | `"title"` | 노드 제목으로 쓸 필드(없으면 id를 씁니다). |
| `descriptionField` | 없음 | 카드 제목 아래에 붙일 한 줄 설명(선택). |
| `kindField` | 없음 | 노드의 종류를 담은 필드(예: `"kind"`, `"type"`). 정하면 카드는 같은 종류의 노드 누구에게도 없는 관계 줄을 뺍니다. 나가는 연결 줄과 두 단계 이웃 줄은 그 종류의 노드 가운데 연결 필드를 가진 것이 하나도 없을 때, 역방향 줄은 그 종류의 노드가 그 연결의 대상이 된 적이 한 번도 없을 때 뺍니다. 연결 필드는 쓰는데 대상이 없으면 그대로 `none`이라고 적습니다. 정하지 않으면 모든 카드에 모든 줄이 들어갑니다. |
| `attributes` | `[]` | 사람들이 거를 때 쓰는 필드. 카드 front matter, `CATALOG.md`의 열, `INDEX.md`의 값별 개수가 됩니다. |
| `edges[]` | `[]` | 종류가 붙은 연결 필드. 문자열 하나만 쓰면 `{ "field": "<name>" }`의 줄임입니다. |
| `edges[].field` | 필수 | 대상 id를 담은 front matter 필드(목록 또는 단일 값). `[[id]]`, `[[id\|alias]]`, `[text](path/id.md)`, `path/id.md`는 모두 `id`로 맞춥니다. |
| `edges[].label` | 필드 이름에서 만듦 | 카드에 적을 이름. |
| `edges[].reverse` | 없음 | 역방향에 붙일 이름(예: `"Used by"`). 이 값을 넣으면 카드마다 이 연결로 자기를 가리키는 노드를 적습니다. 사람들이 "X에 의존하는 것은 무엇인가"를 묻는 연결에 넣으세요. |
| `edges[].external` | `false` | 대상이 노드가 아닌 연결(예: 데이터셋 이름). 대상은 글자로만 적고, 공유 중간 노드로는 쓸 수 있습니다. 이 값이 없으면 모르는 id로 가는 연결은 경고와 함께 버립니다. |
| `sharedNeighbors.via` | 없음 | 대상을 공유 중간 노드로 쓸 연결 필드(근거, 인용, 데이터셋, 설계 문서). 같은 중간 노드를 가리키는 두 노드가 두 단계 이웃입니다. 그런 질문이 실제로 나오는 곳에만 넣으세요. |
| `sharedNeighbors.label` | `"Shares <label> with"` | 카드에 적을 이름. |
| `sharedNeighbors.hubThreshold` | 자동 | 이 수 이상의 노드가 쓰는 중간 노드는 허브로 보고 건너뜁니다(건너뛴 사실은 마커에 적습니다). 넣지 않으면 `via` 연결을 쓰는 노드 수의 25%를 올림한 값으로 정하고, 최소 3입니다. 실제로 쓴 값은 `INDEX.md`에 적힙니다. 그 노드들의 4분의 1 이상이 함께 쓰는 중간 노드는, 검색에서 아주 흔한 낱말처럼 두 노드가 어떻게 이어져 있는지 거의 알려 주지 않습니다. 그런 중간 노드의 사용자까지 이웃으로 적으면 더 구체적인 이웃이 상위 `k`개에서 밀려납니다. 최소 3은 작은 지식 베이스에서 공유 중간 노드가 모두 허브가 되지 않게 하는 하한입니다. 숫자는 실제 카드를 본 뒤에만 넣으세요. 흔한 중간 노드 하나를 같이 쓴다는 이유만으로 이웃이 목록을 채우면 낮추고, 의미 있는 이웃이 빠지면 올립니다. |
| `k` | `10` | 역방향 목록과 두 단계 목록에 적는 이웃의 최대 수. 공유 이웃은 공유하는 중간 노드 수로, 같으면 id 순으로 정렬합니다. 나가는 연결은 전부 적습니다. |
| `card.fields` | `[]` | 카드에 둘, 저자가 쓴 짧은 필드. 이름 또는 `{ "field", "label" }`으로 적습니다. |
| `card.headings` / `card.headingLevels` / `card.maxHeadings` | `true` / `[2]` / `20` | 카드에 적을 본문의 절 제목. |
| `card.maxFieldChars` | `400` | 카드에 둔 필드를 이 글자 수에서 자릅니다(전문은 본문에 그대로 있습니다). |
| `card.maxBytes` | `5120` | 카드 크기 목표. 볼트를 바꾸기 전에 검사합니다. |
| `card.titlesInRelations` | `true` | 관계 목록에 `id` 대신 `id (Title)`을 씁니다. |
| `catalog.maxBytes` | `20480` | 속성 표 크기 목표. 표는 노드 수에 비례해 커지므로, 이 값이 표 하나로 다룰 수 있는 지식 베이스의 크기를 정합니다. |
| `catalog.edgeColumns` | external이 아닌 연결 전부 | 표의 열로 보일 연결 필드. |
| `index.maxBytes` | `4096` | `INDEX.md` 크기 목표. |
| `bodies` | `true` | `bodies/<id>.md`를 쓸지 정합니다. |
| `output` | `"cairn-vault"` | 출력 폴더. Cairn이 만들지 않은 폴더가 비어 있지 않으면 바꾸지 않습니다. |
| `wayfinding.instructionFile` | 없음 | 블록을 담을 에이전트 지침 파일. 설정 파일 기준 경로입니다. 노트로 읽지 않고, `WAYFINDING.md`의 경로를 이 파일 기준으로 쓰며, `check`가 이 파일에 최신 블록이 들어 있는지 확인합니다. |
| `wayfinding.vaultPath` | 계산함 | 규칙에서 볼트를 가리킬 경로. 정하지 않으면 블록 안의 경로(볼트와 원본 폴더)는 모두 지침 파일 기준으로 적습니다. 지침 파일은 `--write`로 준 파일, 없으면 `wayfinding.instructionFile`, 그것도 없으면 설정 파일의 폴더입니다. 다른 경로를 꼭 적어야 할 때만 정하세요. 적은 그대로 씁니다. |
| `wayfinding.search` | `cards/` 대상 파일 검색 | 주제 검색 지시문. 예: ``"run `kb search \"<query>\"`"``. |
| `wayfinding.rules.topical` / `.attribute` / `.relation` / `.composition` | 내장 | 규칙 템플릿. 자리표시자: `{vault}`, `{search}`, `{attributes}`, `{edges}`, `{expanded}`, `{omitted}`(`kindField` 때문에 뺀 줄을 알리는 문장), `{source}`. |
| `wayfinding.general` | 일반 규칙 4개 | 일반 규칙을 이 값으로 바꿉니다. |
| `wayfinding.extraRules` | `[]` | 네 종류 규칙 뒤에 덧붙일 규칙 줄. |
| `wayfinding.markers` | `{ "start": "<!-- cairn:wayfinding:start -->", "end": "<!-- cairn:wayfinding:end -->" }` | 지침 파일 안에서 블록 앞뒤에 둘 표지. 그 파일이 이미 자기 표지를 쓰고 있으면 바꿉니다. `guide --write`와 `check`는 여기 정한 표지를 씁니다. |
| 규칙 안의 배치 자리표시자 | — | 위 자리표시자에 더해 규칙 템플릿과 `wayfinding.search`에서 `{card}`(`<볼트>/<카드 경로, id 자리는 <id>>`), `{cardsDir}`, `{body}`, `{bodiesDir}`를 쓸 수 있습니다. 이 값은 `layout`을 따라갑니다. 기본 규칙도 이 자리표시자를 쓰므로, `layout`으로 카드나 본문 위치를 옮겨도 안내가 틀리지 않습니다. |
| `layout.cards` | `"cards/{stem}.md"` | 볼트 안에서 카드를 둘 곳. `.md`로 끝나고 `{stem}`(파일 이름에 쓸 수 있게 고친 id)이 든 상대 경로입니다. `{id}`라고 써도 같습니다. 크기 목표와 `check`는 이 모양으로 카드를 찾습니다. |
| `layout.bodies` | `"bodies/{stem}.md"` | 본문 전문을 둘 곳(예: `"text/{stem}-text.md"`). |
| `layout.wayfinding` | `"WAYFINDING.md"` | 볼트 안 길 안내 파일의 경로. 블록을 지침 파일에만 두려면 `null`로 빼 둡니다. |
| `sharedNeighbors.notes` | 없음 | `via` 대상마다 노트를 하나씩 따로 씁니다. 그 대상을 함께 쓰는 노드 전체가 파일 하나에 모입니다. `include`에는 노트 파일을 고르는 glob(`source.dir` 기준)을 적고, 이 파일들은 노드로 읽지 않습니다. 노트 파일은 `source.include`에도 걸리고 `source.exclude`에는 걸리지 않아야 합니다. `include`에 걸리는 파일이 하나도 없으면 경고로 알려 줍니다. 노트를 쓰면 `via` 연결은 노트를 가리키므로, 노트가 없는 대상은 경고와 함께 버립니다. |
| `sharedNeighbors.notes.include` / `.idField` / `.titleField` / `.path` | `[]` / `"$filename"` / `"title"` / `"<via>/{stem}.md"` | 노트 파일, 노트의 id와 제목을 읽는 법, 노트를 둘 곳. 노트는 원본 파일 그대로에 그 대상을 쓰는 노드 목록을 붙인 것입니다. 노트 내용도 지문에 들어갑니다. |
| `attributeNotes.attributes` | 없음 | 값마다 노트를 하나씩 만들 필드(이름 또는 `{ "field", "label" }`). 노트에는 그 값을 가진 노드를 적습니다. 카드는 자기가 속한 노트를 템플릿 값 `attributeNotes`로 링크할 수 있습니다. |
| `attributeNotes.path` | `"attributes/{attribute}-{value}.md"` | 속성 노트를 둘 곳. 파일 이름이나 `[[위키링크]]`에 쓸 수 없는 글자(`\ / : * ? " < > \| # ^ [ ]`와 공백)는 `-`로 바꿉니다. |
| `templates.card` / `.body` / `.catalog` / `.index` / `.note` / `.attributeNote` / `.wayfinding` | 내장 | 그 종류의 파일을 내장 모양 대신 이 템플릿 파일(설정 파일 기준 경로)로 씁니다. 키를 빼면 내장 모양을 그대로 씁니다. 템플릿 내용도 지문에 들어갑니다. [템플릿](#템플릿) 절을 보세요. |

출력은 결정적입니다. 자연 정렬로 순서를 고정하고, 타임스탬프를 넣지 않고, 줄바꿈은 `\n`만 씁니다. 입력이 같으면 어느 컴퓨터에서든 바이트 단위로 같은 파일이 나옵니다.


## 템플릿

템플릿은 Cairn이 계산하는 것은 그대로 두고, 만들어지는 파일의 모양만 바꿉니다. 다른 언어로 된 이름표, 옵시디언용 `[[위키링크]]`, 카드 안의 다른 순서, front matter 칸 추가 같은 것들입니다. 그래프, 허브 규칙, 상위 `k`개 제한, 크기 목표, 지문은 바뀌지 않습니다. `templates`의 키 하나가 파일 한 종류를 맡습니다.

| 키 | 언제 쓰나 | 템플릿이 받는 값 |
|---|---|---|
| `card` | 노드마다 | 노드 보기(아래) |
| `body` | 노드마다(`bodies`를 켰을 때) | 노드 보기. `body`는 front matter 뒤의 글입니다 |
| `catalog` | `CATALOG.md` | `count`, `nodes`(노드 보기 목록), `attributes`, `edgeColumns` |
| `index` | `INDEX.md` | `count`, `counts.nodes` / `.bodies` / `.notes` / `.attributeNotes`, `source`, `attributeGroups[]`(`field`, `label`, `notes[]` — 각각 `value`, `path`, `target`), `edges[]`(`field`, `label`, `reverse`, `total`), `edgeTotal`, `hub`, `k` |
| `note` | 중간 노트마다 | `note`(`id`, `title`, `name`, `raw`, `body`, `data`, `path`, `target`), `users`(노드 참조 목록), `via`, `label` |
| `attributeNote` | 속성 값마다 | `field`, `label`, `value`, `path`, `target`, `count`, `members`(노드 보기 목록) |
| `wayfinding` | 표지 사이의 블록 | 규칙 자리표시자를 값으로 받습니다: `vault`, `card`, `cardsDir`, `body`, `bodiesDir`, `search`, `source`, `attributes`, `edges` |

**노드 보기**에는 `id`, `stem`, `title`(없으면 id), `name`(제목 필드에 적힌 그대로, 없으면 빈 값), `description`, `data`(front matter 전부), `body`, `headings`, `kind`, `path` / `target`(카드 경로, `.md`가 있는 것과 없는 것), `cardPath`, `cardTarget`, `bodyPath`, `bodyTarget`이 있고, 다음이 더 있습니다.

- `relations.<연결 필드>.items`: 나가는 연결의 대상. 저자가 적은 순서이고, 노드 참조입니다(`sharedNeighbors.notes`를 쓰면 `via` 연결은 중간 노트).
- `relations.<연결 필드>.reverse`: `all`(가리키는 노드 전부, 자연 정렬), `items`(앞에서 `k`개), `total`, `shown`, `truncated`.
- `shared`: `items`(`count`가 붙은 참조), `total`(허브까지 포함해 중간 노드를 하나라도 함께 쓰는 노드 수), `shown`, `hubs`(건너뛴 허브 중간 노드 수), `capped`(`k`개에서 잘렸는지), `truncated`(`shown < total`), `threshold`, `k`. 잘림 표시는 이 값으로 직접 적습니다. 표시가 없는 목록은 빠짐없는 목록이어야 합니다.
- `attributeNotes`: 이 노드가 속한 속성 노트(`field`, `label`, `value`, `path`, `target`).

노드 참조에는 `id`, `stem`, `title`, `name`, `description`, `path`, `target`과 카드·본문 경로가 있습니다.

템플릿 문법은 다음과 같습니다.

```
{{path}}                              값: 점으로 이은 경로, 지금 항목은 ".", 따옴표 문자열, 반복 안에서는 @index / @number / @first / @last
{{path | filter:arg | filter}}        필터: json, oneLine, trim, trimEnd, upper, lower, list, compact, pluck:"field",
                                      join:", ", count, clip:n (합쳐서 n글자), truncate:n (n글자 뒤에 …),
                                      cell (마크다운 표 칸. cell:"／" 처럼 | 를 다른 글자로 바꿀 수 있음), default:"x"
{{#if path}} … {{else}} … {{/if}}     {{#unless}} 도 있음. 거짓으로 보는 값: 없음, null, false, 0, "", []
{{#each path sep=" · "}} … {{else}} … {{/each}}
{{#with path}} … {{/with}}
{{#filter json}} … {{/filter}}        안쪽을 먼저 그린 뒤 그 글에 필터를 적용
{{! 주석 }}
```

블록 태그 하나만 있는 줄은 줄바꿈까지 함께 지우므로, 블록 태그를 한 줄에 따로 두어도 빈 줄이 남지 않습니다. 끼워 넣은 값은 다시 해석하지 않습니다. 태그는 처음 나오는 `}}`에서 끝나므로, 따옴표 안의 인자에도 `}}`는 쓸 수 없습니다. 문법 오류에는 템플릿 파일 이름과 줄 번호가 붙습니다. 옵시디언 방식 카드의 예는 다음과 같습니다.

```
# {{id}} {{name}}

- Depends on: {{#each relations.depends_on.items sep=" · "}}[[{{id}}]] {{name}}{{else}}none{{/each}}
- Shares evidence with: {{#if shared.total}}{{#each shared.items sep=" · "}}[[{{id}}]] ×{{count}}{{else}}none shown{{/each}}{{#if shared.truncated}} ({{shared.shown}} of {{shared.total}} shown){{/if}}{{else}}none{{/if}}
- Full text: [[{{bodyTarget}}]]
```

## 라이브러리로 쓰기

`src/index.mjs`는 CLI가 쓰는 함수를 그대로 내보냅니다. `planNodes(config, { nodes, notes })`는 이미 읽어 둔 문서(`nodes`: `{ id?, rel?, data, body }`, `notes`: `{ id?, rel?, raw, data, body }`)로 볼트를 계획해 `{ files, counts, warnings, over, graph }`를 돌려주고, 아무것도 쓰지 않습니다. 그래서 다른 시스템이 자기 읽기 코드, 권한 확인, 잠금, 원자적 교체를 그대로 두고 카드 층만 Cairn에 맡길 수 있습니다. `source` 폴더가 없으면 `resolveConfig(raw, baseDir, …)`에 `{ requireSource: false }`를 넘깁니다.

## 볼트 갱신

지문에는 노드 파일(id가 있는 파일), 설정, 생성기 버전이 들어갑니다. 이 가운데 하나라도 바뀌면 다시 빌드합니다. 설정을 고쳤을 때도 마찬가지입니다.

- **git hook**(노트가 git 저장소에 있을 때만): [`hooks/post-merge.sample`](../hooks/post-merge.sample)을 노트가 든 저장소의 `.git/hooks/post-merge`(와 `post-checkout`)로 복사하고, 맨 위의 `CAIRN_BIN`과 `CAIRN_CONFIG`를 고친 뒤 실행 권한을 줍니다. 훅은 먼저 저장소 루트로 옮겨 가므로 상대 경로는 루트 기준으로 읽습니다. 설정 파일이나 Cairn이 저장소 밖에 있으면(예: 설정 파일을 한 단계 위에 둔 경우) `../cairn.config.json`이나 절대 경로를 쓰세요. 이 훅은 `build --if-stale --quiet`를 실행하며 git 작업을 막지 않고, 건너뛸 때(node, Cairn, 설정 파일을 못 찾을 때)나 실패할 때 한 줄로 알립니다.
- **watch**: 편집하는 동안 `node path/to/cairn/bin/cairn.mjs watch`를 켜 둡니다. 노트가 git 저장소에 없어도 씁니다.
- **CI**: 볼트를 커밋한다면, `cairn check`로 볼트가 낡은 pull request를 실패로 처리합니다.

볼트를 다룰 때는 원본 노트의 접근 규칙을 그대로 따릅니다. 볼트를 `.gitignore`에 넣을지는 볼트 폴더를 품은 git 저장소에서 정합니다(`git -C <볼트가 들어갈 폴더> rev-parse --show-toplevel`). 그런 저장소가 없으면 정할 것도 없습니다. 무시 목록에 넣는 편이 안전합니다. 볼트는 생성물이라 언제든 다시 만들 수 있고, 노트와 같은 글을 담고 있기 때문입니다. 커밋은 그 저장소에 이미 노트가 같은 공개 범위로 들어 있고, CI에서 `check`를 돌리거나 Node 없이 볼트를 읽을 사람이 있을 때만 하세요. 노트보다 공개 범위가 넓은 저장소에는 절대 넣지 말고, 노트가 비공개라면 동기화하거나 공개하는 폴더 밖에 두세요. 지문은 자기를 계산한 사본만 보므로, 갱신이 늦은 로컬 사본은 아무 알림 없이 낡아 갑니다.
