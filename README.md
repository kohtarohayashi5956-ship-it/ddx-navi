# 主訴別DDxナビ（獣医師向け鑑別・初期対応支援ツール）

若手獣医師向けの、主訴から鑑別疾患・初期対応を支援するβ版ツールです。
診断を代行するものではなく、最終判断は担当獣医師が行うことを前提としています。

## 現在の状態

- **現行freeze版**：`app/ddx-8.2-phase7c-sex-neuter-ui.html`
- **回帰テスト結果**：646 PASS / 0 FAIL（総計646）
- **フェーズ**：Phase 7d完了・freeze済み。次は Phase 7 field feedback（3〜5名の若手獣医師による実地試用）

## ディレクトリ構成

```
app/              現行のアプリ本体（単一HTMLファイル）
tests/            回帰テスト（regression_test.js）
field-feedback/   実地試用プロトコル・フィードバックフォーム・観察シート
design-docs/      各フェーズの設計記録・実装サマリー
archive/          過去フェーズの中間HTML（履歴用、動作保証なし）
```

## テストの実行方法

初回のみ依存パッケージをインストールしてください（`jsdom`を使用）。

```bash
npm install jsdom
```

そのあとは以下でOKです（資料の一時コピー・実行・後片付けを自動で行います）。

```bash
npm test
```

期待結果：

```
非UIテスト: 645 PASS / 0 FAIL
UI遷移テスト: 1 PASS / 0 FAIL
総PASS: 646 / 総FAIL: 0 / 総計: 646
```

### 手動で実行する場合

```bash
cp field-feedback/*.md field-feedback/*.txt app/
cp design-docs/phase6_beta_test_scenarios.md app/
node tests/regression_test.js app/ddx-8.2-phase7c-sex-neuter-ui.html
rm app/*.md app/*.txt
```

## 開発方針（重要）

- 診断ロジック（DATA / RAW_FINDINGS / FINDINGS / DERIVED_PROBLEMS / trigger / candidate role・score）、
  治療本文、薬剤用量、文献内容は、Phase 2〜5.55の医学的監査プロセスを経て確定したものであり、
  UI/UX改善フェーズ（Phase 5以降）では一切変更していません。
- 新しい指摘（field feedback含む）は、UI/UXの問題と医学ロジックの問題を必ず分類してください
  （`field-feedback/phase7_field_feedback_summary.txt`の分類方法を参照）。
  医学ロジックに関わる指摘はPhase 8以降の別プロセスで扱います。

## 次のアクション

1. `field-feedback/phase7_trial_protocol.md` に沿って、院内3〜5名（卒後1〜3年目中心）で実地試用を行う。
2. `field-feedback/phase7_feedback_form.md` に試用者が記入、`field-feedback/phase7_observation_sheet.md` に観察者が記入。
3. 収集したフィードバックを `field-feedback/phase7_field_feedback_summary.txt` の分類・集計欄に整理する。
4. UIのみで対応可能な指摘から小修正、医学ロジックに関わる指摘はPhase 8以降へ。
