# phase6_beta_test_scenarios.md
## 主訴別DDxナビ β版：代表シナリオスモークテスト（20シナリオ）

本ドキュメントは、Phase 6（generic beta）における動作確認用の代表シナリオ集である。
各シナリオは実際のプロブレムリスト検索パネルで該当する所見（Raw/FINDINGS）を選択し、
派生プロブレム・整合する候補疾患・関連UI（救急初期安定化パネル、高リスク治療UI等）の
表示が「危険な誤誘導（見逃し・過固定）」を起こしていないかを確認するためのものである。

診断ロジック（trigger／candidate role／DERIVED_PROBLEMS）は本フェーズで変更していない。
本ドキュメントはあくまで**既存ロジックの動作確認記録**であり、ロジックの正しさそのものを
新たに保証する文書ではない（ロジックの正しさはPhase 2〜5.55の診断ロジック監査による）。

---

### シナリオ1：嘔吐＋腹痛＋異物誤食
- **想定患者**：若齢犬、誤食機会の多い活動的な個体
- **入力する所見**：f05（嘔吐）、f12（腹痛）、hx_foreign_body_ingestion（異物誤食の目撃・既往歴）
- **期待される派生プロブレム**：dp_acute_vomiting_red_flags（急性嘔吐の危険所見）
- **期待される候補疾患**：vomit_gi_foreign_body_obstruction（消化管異物・閉塞）が上位／primary、vomit_acute_gastroenteritis（急性胃腸炎）に固定されない
- **確認すべきUI**：候補疾患カードの「🚨 見逃すな」バッジ、cand-er-badge表示
- **危険な誤誘導の確認観点**：急性胃腸炎（自己限定的）にのみ候補が収束し、異物閉塞という外科緊急が埋もれていないか

### シナリオ2：猫の食欲不振＋黄疸＋ALP優位
- **想定患者**：肥満歴のある成猫、3日以上の摂食不良
- **入力する所見**：hx_anorexia_persistent（3日以上の食欲不振）、chem_bilirubin_high（総ビリルビン上昇）、chem_alp_high（ALP上昇）、hx_obesity_or_overweight（肥満または肥満歴）
- **期待される派生プロブレム**：dp_feline_hepatic_lipidosis_pattern／dp_anorexia_cat_red_flags
- **期待される候補疾患**：jaundice_feline_hepatic_lipidosis（猫肝リピドーシス）が上位、jaundice_biliary_obstruction_gb_mucocele（胆道閉塞）も必要に応じて残る
- **確認すべきUI**：黄疸関連の複数候補が並列表示されること、cand-groupの分類（primary/branch等）
- **危険な誤誘導の確認観点**：リピドーシスに即断し、胆道閉塞の可能性が完全に消えていないか

### シナリオ3：猫の黄疸＋胆管拡張＋膵炎所見
- **想定患者**：成猫、嘔吐・腹痛を伴う
- **入力する所見**：f02（黄疸）、us_bileduct_dilation（胆管拡張）、spec_cpl_fpl_high（Spec cPL/fPL上昇）、us_pancreas_inflam（膵臓周囲の炎症所見）
- **期待される派生プロブレム**：dp_biliary_obstruction／dp_pancreatitis_pattern
- **期待される候補疾患**：jaundice_cholangitis_cat（胆管炎）、jaundice_pancreatitis-associated（膵炎による胆道圧迫）、jaundice_biliary_obstruction_gb_mucocele（胆道閉塞）が候補
- **確認すべきUI**：関連する追加所見・Step3代表参照からの所見追加のしやすさ
- **危険な誤誘導の確認観点**：肝リピドーシスに過固定されず、胆管炎・膵炎関連・胆道閉塞が並列に残ること

### シナリオ4：雄猫の排尿困難＋膀胱拡張＋高K
- **想定患者**：去勢雄猫、繰り返す排尿姿勢
- **入力する所見**：ua_stranguria（しぶり／排尿困難）、pe_large_bladder（膀胱拡張）、elec_k_high（高カリウム血症）
- **期待される派生プロブレム**：dp_urinary_obstruction／dp_hyperkalemia_emergency
- **期待される候補疾患**：dysuria_urethral_obstruction（尿道閉塞）がprimary
- **確認すべきUI**：救急モードON時に初期安定化パネルのUカードが強調（er-stab-hit）、ECG・鎮静/麻酔前確認・高K治療用量の院内プロトコル確認の文言
- **危険な誤誘導の確認観点**：特発性膀胱炎（FIC）等の非閉塞性疾患のみに候補が寄らないこと

### シナリオ5：高窒素血症＋腎盂/尿管拡張
- **想定患者**：成犬、多飲多尿の既往あり
- **入力する所見**：chem_bun_high（BUN上昇）、chem_crea_high（Cre上昇）、us_renal_pelvis_dilation（腎盂拡張）、us_ureter_dilation（尿管拡張）
- **期待される派生プロブレム**：dp_azotemia／dp_renal_obstruction
- **期待される候補疾患**：dysuria_ureteral_obstruction（尿管閉塞）、pupd_pyelonephritis（腎盂腎炎）、vomit_acute_kidney_injury（AKI）／vomit_chronic_kidney_disease（CKD）の分岐
- **確認すべきUI**：候補疾患カードのunconfirmed（未確認の決め手）・next_test表示
- **危険な誤誘導の確認観点**：尿道閉塞（下部尿路）に不適切に固定されず、上部尿路閉塞（尿管閉塞）が候補として見えること

### シナリオ6：呼吸困難＋胸水
- **想定患者**：犬または猫、急性の努力呼吸
- **入力する所見**：f13（呼吸困難・努力呼吸）、rad_pleural_effusion（胸水を示唆する胸部X線所見）
- **期待される派生プロブレム**：dp_respiratory_distress_emergency／dp_pleural_space_disease
- **期待される候補疾患**：cough_pleural_mediastinal（胸腔・縦隔疾患）等の胸水関連候補
- **確認すべきUI**：救急モードON時にA/Bカードが強調、「開口呼吸・チアノーゼでは強制保定を避ける」の文言表示
- **危険な誤誘導の確認観点**：画像診断を急がせる前に安定化（酸素化・最小限ハンドリング）の注意が表示されること

### シナリオ7：左房拡大＋肺胞パターン
- **想定患者**：高齢犬、僧帽弁疾患の既往を疑う
- **入力する所見**：echo_la_enlargement（左房拡大）、rad_caudodorsal_alveolar（後背側肺胞パターン）
- **期待される派生プロブレム**：dp_cardiogenic_pulmonary_edema_pattern
- **期待される候補疾患**：cough_cardiogenic_pulmonary_edema_chf（心原性肺水腫/CHF）が上位
- **確認すべきUI**：治療欄の「過剰輸液に注意」の文言、救急モードON時のA/BまたはCカードの強調
- **危険な誤誘導の確認観点**：画像的裏付け（左房拡大・肺胞パターン）なしに心原性と決めつけていないか、逆に本シナリオでは正しく上位に上がること

### シナリオ8：発作＋低血糖
- **想定患者**：犬または猫、空腹時の発作
- **入力する所見**：f14（発作・痙攣）、chem_glucose_low（低血糖）
- **期待される派生プロブレム**：dp_seizure_pattern／dp_hypoglycemia_pattern
- **期待される候補疾患**：seizure_metabolic（代謝性）がcritical_mimic、collapse_endocrine（インスリノーマ等）も候補
- **確認すべきUI**：救急モードON時にDカードが強調、「発作持続/群発なら発作停止を優先」「低血糖、低Ca、高アンモニア、中毒を確認」の文言
- **危険な誤誘導の確認観点**：特発性てんかんに即断せず、治療可能な代謝性原因（低血糖等）が優先的に見えること

### シナリオ9：高齢発症発作＋神経学的欠損
- **想定患者**：高齢犬、初発の発作
- **入力する所見**：hx_seizure_single（単発の発作）、pe_neuro_deficit_lateralizing（片側性の神経学的欠損）、pe_mentation_altered（意識レベルの変化）
- **期待される派生プロブレム**：dp_seizure_pattern
- **期待される候補疾患**：seizure_brain_tumor_structural（脳腫瘍・構造的疾患）がcritical_mimicとして残る
- **確認すべきUI**：候補疾患カードのrole表示（critical_mimic等）
- **危険な誤誘導の確認観点**：特発性てんかん（1〜5歳での発症が典型）に固定されず、高齢初発＋神経学的欠損という組み合わせで構造的疾患が候補に残ること

### シナリオ10：血性腹水＋貧血
- **想定患者**：高齢犬、急性の虚脱
- **入力する所見**：fluid_hemorrhagic（血性体腔液）、cbc_hct_low（HCT/PCV低下）
- **期待される派生プロブレム**：dp_hemoabdomen_hemothorax
- **期待される候補疾患**：collapse_tamponade_hemoabdomen（心タンポナーデ・腹腔内出血）、bleeding_neoplastic_hemorrhage_hemoabdomen（腫瘍性出血）が候補
- **確認すべきUI**：救急モードON時にCカードが強調、「FAST/POCUSで胸腹水・心嚢水を確認」の文言
- **危険な誤誘導の確認観点**：抗凝固性殺鼠剤中毒等の他の出血性疾患も候補として排除されすぎていないか（critical_mimicとして残るか）

### シナリオ11：細胞内細菌を伴う体腔液
- **想定患者**：犬、急性腹痛＋発熱
- **入力する所見**：fluid_intracellular_bacteria（細胞内細菌）、us_abd_effusion（腹水）、cbc_neutrophilia（好中球増多）
- **期待される派生プロブレム**：dp_septic_cavitary
- **期待される候補疾患**：fever_septic_peritonitis（敗血症性腹膜炎）が上位
- **確認すべきUI**：治療欄の抗菌薬適正使用（培養結果に基づくデエスカレーション）の文言、外科的介入（感染源コントロール）の記載
- **危険な誤誘導の確認観点**：抗菌薬のみでの管理に見えず、外科的な感染源コントロールが治療欄の中心に見えること

### シナリオ12：慢性下痢＋低Alb＋腸管壁肥厚
- **想定患者**：中年犬、3週以上の下痢と体重減少
- **入力する所見**：f06（下痢・随伴）、chem_alb_low（低アルブミン血症）、us_gi_wall_thick（消化管壁肥厚）
- **期待される派生プロブレム**：dp_hypoalbuminemia／dp_chronic_vomiting_weightloss
- **期待される候補疾患**：sb_diarrhea_chronic_enteropathy_ple（慢性腸症/PLE）、sb_diarrhea_alimentary_lymphoma（消化管型リンパ腫）が候補
- **確認すべきUI**：治療欄avoidの「ステロイド単独投与（診断前）」に関する注意文言
- **危険な誤誘導の確認観点**：確定診断（生検・クローナリティ検査）前にステロイド導入を促す表現になっていないか

### シナリオ13：皮膚掻痒＋耳痒み＋マラセチア
- **想定患者**：若齢犬、慢性の掻痒
- **入力する所見**：f18（掻痒）、pe_ear_pruritus（耳の痒み）、cyto_skin_yeast（皮膚細胞診で酵母＝マラセチア）
- **期待される派生プロブレム**：dp_pruritus_pattern／dp_otitis_pattern
- **期待される候補疾患**：pruritus_otitis_externa（外耳炎）、pruritus_pyoderma_malassezia（マラセチア性皮膚炎）が候補
- **確認すべきUI**：所見カテゴリタブ「皮膚・耳・眼」からの追加所見選択のしやすさ
- **危険な誤誘導の確認観点**：アトピー性皮膚炎のみに固定されず、二次感染（マラセチア・外耳炎）が候補として見えること

### シナリオ14：皮膚腫瘤＋肥満細胞細胞診
- **想定患者**：犬、皮膚の急速増大する腫瘤
- **入力する所見**：pe_cutaneous_mass（皮膚腫瘤）、cyto_mast_cells（肥満細胞を認める）
- **期待される派生プロブレム**：dp_cutaneous_mass_pattern
- **期待される候補疾患**：mass_mast_cell_tumor（肥満細胞腫）がcritical_mimic/上位
- **確認すべきUI**：候補疾患カードの「⚠️ 高リスク治療あり」バッジ、疾患カード内の専門判断バッジ
- **危険な誤誘導の確認観点**：良性腫瘤と即断させる表示になっていないか（細胞診の重要性が強調されているか）

### シナリオ15：急性跛行＋非負重＋局所腫脹
- **想定患者**：犬、外傷歴不明の急性跛行
- **入力する所見**：pe_non_weight_bearing_lameness（非負重性跛行）、pe_limb_swelling（肢腫脹）
- **期待される派生プロブレム**：dp_lameness_pattern／dp_bite_wound_abscess_pattern
- **期待される候補疾患**：lameness_fracture_luxation（骨折・脱臼）、mass_abscess_bite_wound（膿瘍・咬傷）、lameness_septic_arthritis（感染性関節炎）が候補
- **確認すべきUI**：救急モードON時にEカードが強調（非負重性跛行・外傷トリガー）
- **危険な誤誘導の確認観点**：軟部組織損傷（自己限定的）のみに固定されず、骨折・感染性疾患が候補として残ること

### シナリオ16：多飲多尿＋高血糖＋ケトン＋代謝性アシドーシス
- **想定患者**：中年犬、元気消失を伴う
- **入力する所見**：f04（多飲多尿）、chem_glucose_high（高血糖）、ua_ketonuria（ケトン尿）、abg_met_acidosis（代謝性アシドーシス）
- **期待される派生プロブレム**：dp_diabetic_ketosis／dp_dka
- **期待される候補疾患**：vomit_diabetic_ketoacidosis（DKA）が上位
- **確認すべきUI**：疾患カード内の高リスク薬剤UI（速効型インスリンCRI・カリウム補充）、候補疾患カードの「⚠️ 高リスク治療あり」バッジ
- **危険な誤誘導の確認観点**：輸液・電解質補正よりインスリン投与を先行させるような誤読を招く表示になっていないか（治療欄sumの「輸液・電解質補正を先行」の文言が確認できるか）

### シナリオ17：アセトアミノフェン曝露＋チアノーゼ/メトヘモグロビン
- **想定患者**：猫、鎮痛薬誤飲歴
- **入力する所見**：hx_acetaminophen_ingestion（アセトアミノフェン誤飲歴）、pe_cyanosis_brown_mucosa（チアノーゼ様褐色粘膜）、cbc_methemoglobin（メトヘモグロビン測定：高値）
- **期待される派生プロブレム**：dp_acetaminophen_methemoglobin_confirmed_pattern
- **期待される候補疾患**：jaundice_acetaminophen_toxicosis（アセトアミノフェン中毒）が上位
- **確認すべきUI**：治療欄の高リスク薬剤UI（N-アセチルシステイン）、文献差ありバッジ、主訴カードからのT（中毒）救急パネル導線
- **危険な誤誘導の確認観点**：少量誤飲・軽微症状として経過観察のみを促す表現になっていないか（猫の感受性の高さが明記されているか）

### シナリオ18：ブドウ/レーズン曝露＋高窒素血症
- **想定患者**：犬、誤食歴あり
- **入力する所見**：hx_grape_raisin_ingestion（ブドウ／レーズン誤飲歴）、chem_bun_high（BUN上昇）、chem_crea_high（Cre上昇）
- **期待される派生プロブレム**：dp_renal_toxin_pattern／dp_grape_raisin_renal_confirmed_pattern
- **期待される候補疾患**：vomit_grape_raisin_toxicosis（ブドウ/レーズン中毒）、vomit_acute_kidney_injury（AKI）が候補
- **確認すべきUI**：救急モードON時にTカードが強調（中毒曝露トリガー）
- **危険な誤誘導の確認観点**：無症状・少量誤飲だからと経過観察のみを促していないか（個体差が大きく少量でも重度AKIのリスクがあることが明記されているか）

### シナリオ19：蜂刺され＋虚脱/呼吸困難
- **想定患者**：犬、急性発症の虚脱
- **入力する所見**：hx_insect_sting（虫刺され歴）、pe_collapse_shock（虚脱・ショック様症状）、pe_dyspnea（呼吸困難）
- **期待される派生プロブレム**：dp_envenomation_anaphylaxis_pattern／dp_anaphylaxis_sting_collapse_pattern／dp_anaphylaxis_sting_dyspnea_pattern
- **期待される候補疾患**：collapse_anaphylaxis（アナフィラキシー）がcritical_mimic/上位
- **確認すべきUI**：治療欄の高リスク薬剤UI（エピネフリン）、救急モードON時にA/B・Cカードが強調
- **危険な誤誘導の確認観点**：抗ヒスタミン薬・ステロイドのみで対応が完結するような誤読を招かないか（エピネフリンが主治療である旨が明記されているか）

### シナリオ20：乳腺腫脹＋発熱＋産後/授乳中
- **想定患者**：出産・授乳期の犬または猫
- **入力する所見**：pe_mammary_swelling（乳腺腫脹）、f01（発熱）、hx_postpartum（産後）、hx_lactating（授乳中）
- **期待される派生プロブレム**：dp_postpartum_lactation_pattern
- **期待される候補疾患**：repro_mastitis（乳腺炎）、repro_dystocia_postpartum_uterine（難産・産後子宮疾患）が候補
- **確認すべきUI**：主訴別動的タブ「生殖器・乳腺の異常」からの関連所見追加
- **危険な誤誘導の確認観点**：単純な乳腺腫瘤（腫瘍性）として片付けられず、産褥期特有の炎症性疾患が候補として自然に誘導されること

---

## スモークテスト実施上の注意

- 各シナリオは「該当する所見をチェックし、派生プロブレム・整合する候補疾患・関連UIを目視確認する」という手順で行う。
- 「期待される候補疾患」に記載した疾患が**候補リストに出現すること**、および**危険な誤誘導の確認観点に挙げた懸念が実際には生じていないこと**の両方を確認する。
- 本ドキュメントの確認結果、候補の出現状況・role（primary/branch/critical_mimic/conditional）に疑義が生じた場合は、UI表示の問題ではなく**診断ロジック側の確認事項**として別途扱う（Phase 6の範囲外）。
- 全20シナリオは、消化器（1-3・12）、泌尿器（4-5）、呼吸器・循環器（6-7）、神経（8-9）、体腔液・出血（10-11）、皮膚・腫瘤（13-14）、整形外科（15）、内分泌代謝（16）、中毒（17-18）、救急全身（19）、生殖器・乳腺（20）の領域を横断するよう構成した。
