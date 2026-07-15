// 主訴別DDxナビ - プロブレムリスト機能 回帰テスト
// 代表救急・内科ケース＋支持所見分離＋猫黄疸クラスター
// 実行: node regression_test.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(process.argv[2] || 'base6.html', 'utf8');

const CASES = [
  {name:'①アジソン病様電解質パターン', check:['elec_na_low','elec_k_high','elec_nak_low'],
    expectDP:['副腎皮質機能低下症様の電解質パターン'], expectCand:['副腎皮質機能低下症（アジソン病）']},
  {name:'②高Bil＋胆管拡張＋膵炎関連所見', check:['chem_bilirubin_high','us_bileduct_dilation','us_pancreas_inflam'],
    expectDP:['高ビリルビン血症','胆道閉塞を疑うパターン'], expectCand:['胆道閉塞・胆嚢粘液嚢腫','膵炎による胆道圧迫']},
  {name:'③尿閉＋高K', check:['ua_oliguria_anuria','elec_k_high'],
    expectDP:['尿路閉塞／閉塞性腎後性高窒素血症'], expectCand:['尿道閉塞']},
  {name:'④高血糖＋ケトン＋アシドーシス', check:['chem_glucose_high','ua_ketonuria','abg_met_acidosis'],
    expectDP:['糖尿病性ケトーシス／DKAパターン','糖尿病性ケトアシドーシス'], expectCand:['内分泌（DKA・甲状腺機能亢進等）','糖尿病性ケトアシドーシス（DKA）']},
  {name:'⑤血性腹水＋貧血', check:['fluid_hemorrhagic','cbc_hct_low'],
    expectDP:['血腹／血胸'], expectCand:['心タンポナーデ・腹腔内出血（脾腫瘤破裂）','腫瘍性出血（血管肉腫・腹腔内出血）']},
  {name:'⑥左房拡大＋肺胞パターン', check:['echo_la_enlargement','rad_alveolar'],
    expectDP:['心原性うっ血を疑うパターン'], expectCand:['心原性肺水腫／うっ血性心不全']},
  {name:'⑦腎盂／尿管拡張', check:['us_renal_pelvis_dilation','us_ureter_dilation'],
    expectDP:['上部尿路閉塞を疑う画像パターン'], expectCand:['尿石症']},
  {name:'⑧細胞内細菌を伴う体腔液', check:['fluid_intracellular_bacteria'],
    expectDP:['敗血症性体腔炎'], expectCand:['化膿性腹膜炎']},
  {name:'⑨GDV疑い', check:['rad_gdv_pattern'],
    expectDP:['GDV（胃拡張捻転）疑い'], expectCand:['腹腔内圧上昇（腹水・GDV）']},
  {name:'⑩気胸疑い', check:['rad_pneumothorax'],
    expectDP:['気胸疑い'], expectCand:['気胸']},
  {name:'⑪子宮蓄膿症画像パターン', check:['us_uterine_fluid'],
    expectDP:['子宮蓄膿症を疑う画像パターン'], expectCand:['子宮蓄膿症']},
  {name:'⑫重度貧血・循環不全', check:['cbc_hct_critical'],
    expectDP:['重度貧血・循環不全パターン'], expectCand:['貧血・出血']},
  {name:'⑬多因子性凝固障害/DIC疑い', check:['coag_ddimer_high','cbc_platelet_low'],
    expectDP:['多因子性凝固障害／DIC疑い'], expectCand:['DIC（播種性血管内凝固）']},
  {name:'⑭腫瘍性細胞診（guidance・候補0件が正）', check:['cyto_round_cell_neoplasia'],
    expectDP:['腫瘍性細胞診パターン（採材部位・系統の入力待ち）'], expectCand:[]},
];

// 支持所見分離の検証（乳び性胸水で膿胸が「未評価」表示になることを確認）
const FELINE_JAUNDICE_CASES = [
  {name:'猫黄疸A：高Bilのみ→肝前性/性/後性が並列、リピドーシスはprimary固定しない',
    check:['chem_bilirubin_high'],
    expectDP:['高ビリルビン血症'],
    expectCandAny:['溶血性貧血（IMHA等）','肝細胞性肝障害（肝炎・中毒性・その他）','胆道閉塞・胆嚢粘液嚢腫'],
    notPrimary:'猫肝リピドーシス'},
  {name:'猫黄疸B：肝リピドーシス典型像→リピドーシスがprimary、胆道閉塞は非固定',
    check:['chem_bilirubin_high','hx_anorexia_persistent','hx_obesity_or_overweight','chem_alp_high','chem_alp_ggt_disproportion_cat','us_liver_diffuse','us_no_bileduct_dilation'],
    expectDP:['猫肝リピドーシスを疑うパターン','猫肝リピドーシスの典型像（複数所見が整合）'],
    expectPrimary:'猫肝リピドーシス',
    notPrimary:'胆道閉塞・胆嚢粘液嚢腫'},
  {name:'猫黄疸C：胆管炎/膵炎関連→胆管炎・膵炎関連胆道病変・胆道閉塞パターンが出る',
    check:['chem_bilirubin_high','f01','cbc_neutrophilia','cbc_left_shift','us_bileduct_dilation','us_pancreas_inflam'],
    expectDP:['胆道閉塞を疑うパターン'],
    expectCandAny:['胆管炎・胆管肝炎（猫）','膵炎による胆道圧迫','胆道閉塞・胆嚢粘液嚢腫'],
    notPrimary:'猫肝リピドーシス'},
  {name:'猫黄疸D：肝胆道腫瘍/リンパ腫疑い→条件付き候補として表示',
    check:['chem_bilirubin_high','us_liver_focal','us_abd_ln_enlarged','us_abd_effusion','cyto_round_cell_neoplasia'],
    expectDP:['肝胆道腫瘍／浸潤性疾患を疑うパターン'],
    expectCandAny:['肝・胆道腫瘍／転移','リンパ腫・リンパ節転移']},
];

const VOMIT_ANOREXIA_CASES = [
  {name:'嘔吐1：急性反復嘔吐＋腹痛＋腸管拡張→消化管閉塞/異物が上位',
    check:['f12','rad_si_dilation'],
    expectDP:['急性嘔吐の危険所見'],
    expectPrimary:'消化管異物・閉塞'},
  {name:'嘔吐2：猫、食欲不振3日以上＋高Bil＋ALP優位→猫肝リピドーシス',
    check:['hx_anorexia_persistent','chem_bilirubin_high','chem_alp_high'],
    expectDP:['猫の食欲不振で見逃したくないパターン'],
    expectPrimary:'猫肝リピドーシス'},
  {name:'嘔吐3：犬、嘔吐＋Na/K低下＋高K→アジソン病',
    check:['elec_na_low','elec_nak_low','elec_k_high'],
    expectDP:['副腎皮質機能低下症様の電解質パターン'],
    expectPrimary:'副腎皮質機能低下症（アジソン病）'},
  {name:'嘔吐4：高齢猫、慢性嘔吐＋体重減少＋高T4→甲状腺機能亢進症',
    check:['f03','spec_t4_high'],
    expectDP:['慢性嘔吐＋体重減少パターン'],
    expectCandAny:['甲状腺機能亢進（猫）／高Ca血症']},
  {name:'嘔吐5：高齢猫、慢性嘔吐＋体重減少＋腸管壁肥厚→慢性腸症/消化管型リンパ腫',
    check:['f03','us_gi_wall_thick'],
    expectDP:['慢性嘔吐＋体重減少パターン'],
    expectCandAny:['慢性腸症（CE／IBD・蛋白漏出性腸症）','消化管型リンパ腫／腫瘍']},
  {name:'嘔吐6：嘔吐＋高血糖＋ケトン＋代謝性アシドーシス→DKA',
    check:['chem_glucose_high','ua_ketonuria','abg_met_acidosis'],
    expectDP:['糖尿病性ケトアシドーシス'],
    expectCandAny:['糖尿病性ケトアシドーシス（DKA）','内分泌（DKA・甲状腺機能亢進等）']},
  {name:'嘔吐7：嘔吐＋高窒素血症＋乏尿→AKI/腎後性閉塞の除外',
    check:['chem_bun_high','chem_crea_high','ua_oliguria_anuria'],
    expectDP:['高窒素血症'],
    expectCandAny:['急性腎障害（AKI）','尿道閉塞']},
  {name:'嘔吐8：嘔吐＋膵炎マーカー上昇＋膵周囲炎症→膵炎',
    check:['spec_cpl_fpl_high','us_pancreas_inflam'],
    expectDP:['膵炎を疑うパターン'],
    expectPrimary:'膵炎'},
  {name:'嘔吐9：嘔吐＋発熱＋好中球性炎症＋腹水→敗血症性腹膜炎を見逃したくない候補',
    check:['f01','cbc_neutrophilia','cbc_left_shift','f19'],
    expectDP:['炎症性白血球像'],
    expectCandAny:['化膿性腹膜炎']},
  {name:'嘔吐10：猫、食欲不振＋発熱＋黄疸＋胆管拡張→胆管炎/膵炎関連胆道病変',
    check:['hx_anorexia_persistent','f01','chem_bilirubin_high','us_bileduct_dilation'],
    expectDP:['胆道閉塞を疑うパターン'],
    expectCandAny:['胆管炎・胆管肝炎（猫）','膵炎による胆道圧迫']},
  {name:'嘔吐11：急性嘔吐＋異物誤食歴＋腹痛→消化管異物・閉塞が上位、急性胃腸炎のみで終わらない',
    check:['hx_foreign_body_ingestion','pe_abdominal_pain'],
    expectDP:['急性嘔吐の危険所見'],
    expectPrimary:'消化管異物・閉塞'},
  {name:'嘔吐12：猫の慢性嘔吐＋体重減少＋筋層肥厚→慢性腸症/消化管型リンパ腫',
    check:['f03','us_muscularis_thickening_cat'],
    expectDP:['慢性嘔吐＋体重減少パターン'],
    expectCandAny:['慢性腸症（CE／IBD・蛋白漏出性腸症）','消化管型リンパ腫／腫瘍']},
  {name:'嘔吐13：高齢猫＋体重減少＋高T4→甲状腺機能亢進症が候補',
    check:['f03','spec_t4_high'],
    expectDP:['慢性嘔吐＋体重減少パターン'],
    expectCandAny:['甲状腺機能亢進（猫）／高Ca血症']},
  {name:'嘔吐14：嘔吐＋高窒素血症＋尿比重低下→CKD/AKIが候補、腎後性閉塞はprimary固定しない',
    check:['chem_bun_high','chem_crea_high','ua_usg_low'],
    expectDP:['高窒素血症'],
    expectCandAny:['慢性腎臓病','急性腎障害（AKI）'],
    notPrimary:'尿道閉塞'},
  {name:'嘔吐15：嘔吐＋腹水＋好中球性炎症＋細胞内細菌→敗血症性腹膜炎が急性胃腸炎より上位',
    check:['f19','cbc_neutrophilia','cbc_left_shift','fluid_intracellular_bacteria'],
    expectDP:['敗血症性体腔炎'],
    expectCandAny:['化膿性腹膜炎']},
];

const URINARY_CASES = [
  {name:'腎泌尿器1：雄猫、排尿困難＋膀胱拡張＋高K→尿道閉塞がprimary',
    check:['ua_stranguria','pe_large_bladder','elec_k_high'],
    expectDP:['尿路閉塞／閉塞性腎後性高窒素血症'],
    expectPrimary:'尿道閉塞'},
  {name:'腎泌尿器2：高窒素血症＋腎盂拡張＋尿管拡張→尿管閉塞が候補、腎盂腎炎も残る',
    check:['chem_bun_high','chem_crea_high','us_renal_pelvis_dilation','us_ureter_dilation'],
    expectDP:['上部尿路閉塞を疑う画像パターン'],
    expectCandAny:['尿管閉塞','腎盂腎炎']},
  {name:'腎泌尿器3：腹水＋腹水Cre高値＋高K→尿腹症を疑うパターン',
    check:['us_abd_effusion','fluid_creatinine_high','elec_k_high'],
    expectDP:['尿腹症'],
    expectCandAny:['尿腹症']},
  {name:'腎泌尿器4：CKDパターン（Cre+SDMA+尿比重低下+高血圧）→CKD上位、AKIはprimary固定しない',
    check:['chem_bun_high','chem_crea_high','chem_sdma_high','ua_usg_low','poc_hypertension'],
    expectDP:['高窒素血症'],
    expectCandAny:['慢性腎臓病'],
    notPrimary:'急性腎障害（AKI）'},
  {name:'腎泌尿器5：腎盂腎炎パターン（発熱+膿尿+細菌尿+腎盂拡張+高窒素血症）',
    check:['f01','ua_pyuria','ua_bacteriuria','us_renal_pelvis_dilation','chem_bun_high','chem_crea_high'],
    expectDP:[],
    expectCandAny:['腎盂腎炎']},
  {name:'腎泌尿器6：蛋白尿性腎症パターン（UPC高値+低Alb+高血圧）→PLNがprimary',
    check:['ua_upc_high','chem_alb_low','poc_hypertension'],
    expectDP:['蛋白尿性腎症'],
    expectPrimary:'蛋白尿性腎症／糸球体疾患（PLN）'},
  {name:'腎泌尿器7-A：高K単独→尿道閉塞をprimary固定せずアジソン/AKI/尿路閉塞等を鑑別',
    check:['elec_k_high'],
    expectDP:['高K血症／高K性不整脈リスク'],
    expectCandAny:['副腎皮質機能低下症（アジソン病）','急性腎障害（AKI）','尿道閉塞','尿腹症'],
    notPrimary:'尿道閉塞'},
  {name:'腎泌尿器7-B：しぶり単独→下部尿路症状パターン、尿道閉塞はprimary固定しない',
    check:['ua_stranguria'],
    expectDP:['下部尿路症状パターン'],
    expectCandAny:['特発性膀胱炎（FIC）','尿路感染症（UTI）','尿石症','尿道閉塞'],
    notPrimary:'尿道閉塞'},
  {name:'腎泌尿器7-C：しぶり＋膀胱拡張＋高K→尿路閉塞パターンで尿道閉塞がprimary',
    check:['ua_stranguria','pe_large_bladder','elec_k_high'],
    expectDP:['尿路閉塞／閉塞性腎後性高窒素血症'],
    expectPrimary:'尿道閉塞'},
  {name:'腎泌尿器7-D：乏尿・無尿＋高K→尿路閉塞パターンで尿道閉塞が上位候補',
    check:['ua_oliguria_anuria','elec_k_high'],
    expectDP:['尿路閉塞／閉塞性腎後性高窒素血症'],
    expectPrimary:'尿道閉塞'},
];

const RESPIRATORY_CASES = [
  {name:'呼吸器1：呼吸困難＋チアノーゼ→緊急パターン、酸素化方針の表示',
    check:['pe_dyspnea','pe_cyanosis'],
    expectDP:['呼吸困難の緊急パターン'],
    expectGuidance:true,
    expectCandAny:['胸腔・縦隔疾患（胸水・腫瘤）','気胸','心原性肺水腫／うっ血性心不全','猫喘息／慢性気管支炎','上気道閉塞（喉頭麻痺・短頭種気道症候群）']},
  {name:'呼吸器2：左房拡大＋後背側肺胞パターン→心原性肺水腫が上位',
    check:['echo_la_enlargement','rad_caudodorsal_alveolar'],
    expectDP:['心原性肺水腫を疑うパターン'],
    expectPrimary:'心原性肺水腫／うっ血性心不全'},
  {name:'呼吸器3：乾性咳＋ガーガー咳＋気管虚脱所見→気管虚脱が上位、心原性固定しない',
    check:['hx_dry_cough','hx_honking_cough','rad_tracheal_collapse'],
    expectDP:['気管・気管支性咳パターン'],
    expectCandAny:['気管虚脱'],
    notPrimary:'心原性肺水腫／うっ血性心不全'},
  {name:'呼吸器4：慢性咳＋気管支パターン→気管支性咳パターン、心原性固定しない',
    check:['hx_chronic_cough','rad_bronchial_pattern'],
    expectDP:['気管・気管支性咳パターン'],
    expectCandAny:['猫喘息／慢性気管支炎','感染性気管気管支炎（ケンネルコフ）','気管虚脱'],
    notPrimary:'心原性肺水腫／うっ血性心不全'},
  {name:'呼吸器5：猫、喘鳴＋気管支パターン→猫喘息パターンが候補',
    check:['pe_wheeze','rad_bronchial_pattern'],
    expectDP:['猫喘息／下部気道疾患パターン'],
    expectCandAny:['猫喘息／慢性気管支炎']},
  {name:'呼吸器6：発熱＋好中球増多＋前腹側肺胞パターン→肺炎パターン、心原性固定しない',
    check:['f01','cbc_neutrophilia','rad_cranioventral_alveolar'],
    expectDP:['肺炎を疑うパターン'],
    expectCandAny:['誤嚥性肺炎','肺炎・肺腫瘍'],
    notPrimary:'心原性肺水腫／うっ血性心不全'},
  {name:'呼吸器7：胸水＋肺音減弱→胸腔疾患パターン',
    check:['rad_pleural_effusion','pe_muffled_lung_sound'],
    expectDP:['胸腔疾患パターン'],
    expectCandAny:['胸腔・縦隔疾患（胸水・腫瘤）','膿胸']},
  {name:'呼吸器8：気胸所見＋急性呼吸困難→気胸が候補、緊急パターンも発火',
    check:['rad_pneumothorax','pe_dyspnea'],
    expectDP:['気胸疑い','呼吸困難の緊急パターン'],
    expectCandAny:['気胸']},
];

const NEURO_BLOOD_FLUID_CASES = [
  {name:'神経1：発作単独→発作パターン、特発性てんかんprimary固定しない',
    check:['hx_seizure_single'],
    expectDP:['発作パターン（特発性・構造的・反応性の鑑別）'],
    notPrimary:'特発性てんかん'},
  {name:'神経2：発作＋低血糖→代謝性発作が候補',
    check:['hx_seizure_single','chem_glucose_low'],
    expectDP:['発作パターン（特発性・構造的・反応性の鑑別）'],
    expectCandAny:['代謝性（低血糖・肝性脳症・電解質）']},
  {name:'神経3：初発高齢＋発作＋神経欠損→構造的脳疾患が見逃したくない候補に上がる',
    check:['hx_seizure_single','pe_neuro_deficit_lateralizing','pe_mentation_altered'],
    expectDP:['発作パターン（特発性・構造的・反応性の鑑別）'],
    expectCandAny:['脳腫瘍・構造的疾患']},
  {name:'神経4：斜頸＋水平眼振のみ→末梢前庭が候補、中枢固定しない',
    check:['pe_horizontal_nystagmus'],
    expectDP:['前庭症状パターン（末梢／中枢の鑑別）'],
    expectCandAny:['特発性前庭症候群'],
    notPrimary:'起源不明の髄膜脳炎（MUO）'},
  {name:'神経5：斜頸＋垂直眼振＋意識変化→中枢前庭（MUO）が見逃したくない候補に上がる',
    check:['pe_vertical_nystagmus','pe_mentation_altered'],
    expectDP:['前庭症状パターン（末梢／中枢の鑑別）'],
    expectCandAny:['起源不明の髄膜脳炎（MUO）']},
  {name:'神経6：猫、急性後肢麻痺＋冷感＋脈拍低下→大動脈血栓塞栓症が見逃したくない候補の筆頭',
    check:['pe_hindlimb_paresis','pe_cold_extremity','pe_absent_pulse'],
    expectDP:['猫大動脈血栓塞栓症を疑うパターン'],
    expectCandAny:['大動脈血栓塞栓症（猫）']},
  {name:'血液7：HCT低下のみ→貧血パターン、IMHA primary固定しない',
    check:['cbc_hct_low'],
    expectDP:['貧血パターン（再生性・非再生性・原因の鑑別）'],
    notPrimary:'溶血性貧血（IMHA等）'},
  {name:'血液8：HCT低下＋自己凝集＋黄疸→溶血性貧血が上位',
    check:['cbc_hct_low','cbc_autoagglutination','chem_bilirubin_high'],
    expectDP:['溶血パターン'],
    expectPrimary:'溶血性貧血（IMHA等）'},
  {name:'血液9：血小板低下＋PT/aPTT延長＋Dダイマー高値→DICが上位',
    check:['cbc_platelet_low','coag_pt_long','coag_aptt_long','coag_ddimer_high'],
    expectDP:['多因子性凝固障害／DIC疑い'],
    expectPrimary:'DIC（播種性血管内凝固）'},
  {name:'血液10：血小板低下のみ→血小板減少パターン、ITP primary固定しない',
    check:['cbc_platelet_low'],
    expectDP:['血小板減少パターン（原因の鑑別）'],
    notPrimary:'免疫介在性血小板減少症（ITP）'},
  {name:'体腔液11：腹水のみ→腹水パターン、FIP/腫瘍primary固定しない',
    check:['us_abd_effusion'],
    expectDP:['腹水パターン（性状・原因の鑑別）'],
    notPrimary:'FIP（猫伝染性腹膜炎・黄疸型）'},
  {name:'体腔液12：腹水＋細胞内細菌→敗血症性腹膜炎が見逃したくない候補',
    check:['us_abd_effusion','fluid_intracellular_bacteria'],
    expectDP:['腹水パターン（性状・原因の鑑別）','敗血症性体腔炎'],
    expectCandAny:['化膿性腹膜炎']},
  {name:'体腔液13：腹水＋腹水Cre高値→尿腹症が見逃したくない候補',
    check:['us_abd_effusion','fluid_creatinine_high'],
    expectDP:['腹水パターン（性状・原因の鑑別）','尿腹症'],
    expectCandAny:['尿腹症']},
  {name:'体腔液14：腹水＋腹水Bil高値→胆汁性腹膜炎が見逃したくない候補',
    check:['us_abd_effusion','fluid_bilirubin_high'],
    expectDP:['腹水パターン（性状・原因の鑑別）','胆汁性腹膜炎'],
    expectCandAny:['胆汁性腹膜炎']},
];

const ENDOCRINE_CASES = [
  {name:'内分泌1：低血糖単独→低血糖パターン、インスリノーマprimary固定しない',
    check:['chem_glucose_low'],
    expectDP:['低血糖パターン'],
    expectCandAny:['内分泌（インスリノーマ・褐色細胞腫）','敗血症・閉鎖腔感染','肝細胞性肝障害（肝炎・中毒性・その他）','副腎皮質機能低下症（アジソン病）'],
    notPrimary:'内分泌（インスリノーマ・褐色細胞腫）'},
  {name:'内分泌2：発作＋低血糖→代謝性発作が上位',
    check:['hx_seizure_single','chem_glucose_low'],
    expectDP:['発作パターン（特発性・構造的・反応性の鑑別）','低血糖パターン'],
    expectCandAny:['代謝性（低血糖・肝性脳症・電解質）']},
  {name:'内分泌3：高血糖単独→糖尿病primary固定しない',
    check:['chem_glucose_high'],
    expectDP:['高血糖・糖尿病疑いパターン'],
    notPrimary:'糖尿病'},
  {name:'内分泌4：高血糖＋尿糖＋PU/PD→糖尿病が上位、DKA固定しない',
    check:['chem_glucose_high','ua_glucosuria','hx_pupd'],
    expectDP:['高血糖・糖尿病疑いパターン'],
    expectCandAny:['糖尿病'],
    notPrimary:'糖尿病性ケトアシドーシス（DKA）'},
  {name:'内分泌5：高血糖＋尿ケトン＋代謝性アシドーシス→DKAがprimary',
    check:['chem_glucose_high','ua_ketonuria','abg_met_acidosis'],
    expectDP:['糖尿病性ケトーシス／DKAパターン','糖尿病性ケトアシドーシス'],
    expectPrimary:'糖尿病性ケトアシドーシス（DKA）'},
  {name:'内分泌6：高K単独→アジソンprimary固定しない、尿路閉塞等も並列',
    check:['elec_k_high'],
    expectDP:['高K血症／高K性不整脈リスク'],
    expectCandAny:['副腎皮質機能低下症（アジソン病）','急性腎障害（AKI）','尿道閉塞','尿腹症'],
    notPrimary:'副腎皮質機能低下症（アジソン病）'},
  {name:'内分泌7：低Na＋高K＋Na/K低下→アジソン病が上位',
    check:['elec_na_low','elec_k_high','elec_nak_low'],
    expectDP:['副腎皮質機能低下症様の電解質パターン'],
    expectPrimary:'副腎皮質機能低下症（アジソン病）'},
  {name:'内分泌8：高Ca単独→リンパ腫primary固定しない',
    check:['elec_ica_high'],
    expectDP:['真の高Ca血症'],
    expectCandAny:['リンパ腫・リンパ節転移','肛門嚢疾患（膿瘍・腫瘍）','甲状腺機能亢進（猫）／高Ca血症'],
    notPrimary:'リンパ腫・リンパ節転移'},
  {name:'内分泌9：高Ca＋リンパ節腫大→リンパ腫の支持が強まる',
    check:['elec_ica_high','us_abd_ln_enlarged'],
    expectDP:['真の高Ca血症'],
    expectCandAny:['リンパ腫・リンパ節転移']},
  {name:'内分泌10：高T4＋体重減少＋頻脈→甲状腺機能亢進症が上位、CKD併発は未確認で残る',
    check:['spec_t4_high','hx_weightloss','poc_tachycardia'],
    expectDP:['猫甲状腺機能亢進症パターン'],
    expectCandAny:['甲状腺機能亢進（猫）／高Ca血症']},
  {name:'内分泌11：PU/PD＋ALP高値＋多食＋腹部膨満→クッシング疑いが上位',
    check:['hx_pupd','chem_alp_high','hx_polyphagia','pe_potbelly'],
    expectDP:['クッシング症候群疑いパターン'],
    expectCandAny:['副腎皮質機能亢進症（クッシング）']},
  {name:'内分泌12：意識変化＋低BUN＋胆汁酸高値→PSS/肝不全が候補、構造的疾患も残る',
    check:['pe_mentation_altered','chem_bun_low','chem_bile_acid_high'],
    expectDP:['肝性脳症／PSS疑いパターン'],
    expectCandAny:['肝細胞性肝障害（肝炎・中毒性・その他）']},
  {name:'内分泌13：ケトン尿単独→DKA primary固定しない',
    check:['ua_ketonuria'],
    expectDP:[],
    notPrimary:'糖尿病性ケトアシドーシス（DKA）'},
  {name:'内分泌14：ALP高値単独→クッシングprimary固定しない',
    check:['chem_alp_high'],
    expectDP:['クッシング症候群疑いパターン'],
    expectCandAny:['副腎皮質機能亢進症（クッシング）','肝・胆道疾患'],
    notPrimary:'副腎皮質機能亢進症（クッシング）'},
];

const DERM_MASS_EYE_CASES = [
  {name:'皮膚1：掻痒単独→掻痒パターン、アトピーprimary固定しない',
    check:['hx_pruritus'],
    expectDP:['掻痒パターン'],
    notPrimary:'アレルギー性皮膚炎（アトピー・食物）'},
  {name:'皮膚2：掻痒＋腰背部/尾根部＋ノミ糞→ノミアレルギーが上位',
    check:['hx_pruritus','pe_lumbosacral_pruritus','pe_flea_dirt'],
    expectDP:['掻痒パターン'],
    expectCandAny:['ノミ・外部寄生虫（ノミアレルギー・疥癬）']},
  {name:'皮膚3：掻痒＋肢端/耳の慢性再発→アトピー/食物アレルギーが候補、疥癬も残る',
    check:['hx_pruritus','pe_paw_licking','pe_otitis_erythema'],
    expectDP:['掻痒パターン'],
    expectCandAny:['アレルギー性皮膚炎（アトピー・食物）']},
  {name:'皮膚4：皮膚細胞診で球菌＋好中球→膿皮症が上位',
    check:['cyto_skin_cocci','cyto_skin_neutrophils'],
    expectDP:['掻痒パターン'],
    expectCandAny:['膿皮症・マラセチア性皮膚炎（二次感染）']},
  {name:'皮膚5：皮膚細胞診で酵母→マラセチア皮膚炎が上位',
    check:['cyto_skin_yeast'],
    expectDP:['掻痒パターン'],
    expectCandAny:['膿皮症・マラセチア性皮膚炎（二次感染）']},
  {name:'皮膚6：円形脱毛＋落屑＋多頭→皮膚糸状菌症が上位',
    check:['pe_circular_alopecia','pe_scaling','hx_multi_animal_household'],
    expectDP:['皮膚糸状菌症リスクパターン（人獣共通感染に注意）'],
    expectCandAny:['皮膚糸状菌症']},
  {name:'皮膚7：左右対称性脱毛＋PU/PD＋ALP高値→内分泌性が候補、アレルギー固定しない',
    check:['pe_symmetric_alopecia','pe_nonpruritic_alopecia','hx_pupd','chem_alp_high'],
    expectDP:['脱毛パターン'],
    expectCandAny:['内分泌性皮膚疾患＋二次感染'],
    notPrimary:'アレルギー性皮膚炎（アトピー・食物）'},
  {name:'皮膚8：耳痒み＋耳垢酵母→外耳炎が上位',
    check:['pe_ear_pruritus','cyto_ear_yeast'],
    expectDP:['外耳炎パターン'],
    expectCandAny:['外耳炎（耳の掻痒）']},
  {name:'腫瘤9：皮膚腫瘤単独→腫瘤パターン、肥満細胞腫primary固定しない、FNAが次の一手',
    check:['pe_cutaneous_mass'],
    expectDP:['皮膚・皮下腫瘤パターン'],
    expectCandAny:['良性（脂肪腫・組織球腫・嚢胞）','肥満細胞腫'],
    notPrimary:'肥満細胞腫'},
  {name:'腫瘤10：皮膚腫瘤＋肥満細胞細胞診→肥満細胞腫が上位',
    check:['pe_cutaneous_mass','cyto_mast_cells'],
    expectDP:['皮膚・皮下腫瘤パターン'],
    expectCandAny:['肥満細胞腫']},
  {name:'腫瘤11：皮膚腫瘤＋急速増大＋潰瘍→悪性系が候補',
    check:['pe_cutaneous_mass','pe_mass_rapid_growth','pe_mass_ulcerated'],
    expectDP:['皮膚・皮下腫瘤パターン'],
    expectCandAny:['軟部組織肉腫','上皮性腫瘍（扁平上皮癌・基底細胞腫等）']},
  {name:'腫瘤12：リンパ節腫大単独→リンパ節パターン、リンパ腫primary固定しない',
    check:['pe_ln_enlargement'],
    expectDP:['リンパ節腫大パターン'],
    notPrimary:'リンパ腫・リンパ節転移'},
  {name:'腫瘤13：多中心性リンパ節腫大＋高Ca→リンパ腫が上位、高Caパターンも発火',
    check:['pe_multicentric_ln_enlargement','elec_ica_high'],
    expectDP:['リンパ節腫大パターン','真の高Ca血症'],
    expectCandAny:['リンパ腫・リンパ節転移']},
  {name:'腫瘤14：乳腺腫瘤＋潰瘍＋リンパ節腫大→乳腺腫瘍が上位',
    check:['pe_mammary_mass','pe_mass_ulcerated','pe_ln_enlargement'],
    expectDP:['乳腺腫瘤パターン'],
    expectCandAny:['上皮性腫瘍（扁平上皮癌・基底細胞腫等）']},
  {name:'腫瘤15：肛門嚢腫瘤＋高Ca→AGASACAが上位、高Caパターンと連動',
    check:['pe_anal_sac_mass','elec_ica_high'],
    expectDP:['真の高Ca血症'],
    expectCandAny:['肛門嚢疾患（膿瘍・腫瘍）']},
  {name:'眼科16：眼痛単独→眼痛パターン、角膜潰瘍primary固定しない',
    check:['pe_ocular_pain'],
    expectDP:['眼痛パターン'],
    notPrimary:'角膜潰瘍（融解性・デスメ瘤を含む）'},
  {name:'眼科17：フルオレセイン陽性＋眼瞼痙攣→角膜潰瘍が上位',
    check:['fluorescein_positive','pe_blepharospasm'],
    expectDP:['角膜潰瘍パターン','眼痛パターン'],
    expectCandAny:['角膜潰瘍（融解性・デスメ瘤を含む）']},
  {name:'眼科18：眼圧高値＋眼痛＋散瞳＋視覚低下→緑内障がprimary',
    check:['iop_high','pe_ocular_pain','pe_mydriasis','pe_vision_loss'],
    expectDP:['緑内障パターン'],
    expectPrimary:'急性緑内障'},
  {name:'眼科19：充血＋低眼圧＋縮瞳＋房水フレア→ぶどう膜炎が上位、結膜炎固定しない',
    check:['pe_red_eye','iop_low','pe_miosis','aqueous_flare'],
    expectDP:['ぶどう膜炎パターン'],
    expectCandAny:['前部ぶどう膜炎'],
    notPrimary:'結膜炎'},
  {name:'眼科20：急性失明単独→急性失明パターン、SARDS primary固定しない',
    check:['hx_acute_blindness'],
    expectDP:['急性失明パターン'],
    notPrimary:'SARDS（突発性後天性網膜変性）'},
  {name:'眼科21：急性失明＋高血圧＋網膜剥離→高血圧性網膜症が上位',
    check:['hx_acute_blindness','poc_hypertension','fundus_retinal_detachment'],
    expectDP:['急性失明パターン'],
    expectCandAny:['高血圧性網膜症・剥離（猫）']},
  {name:'眼科22：眼脂＋充血のみ→赤目/眼脂パターン、結膜炎primary固定しない、眼痛パターンは発火しない',
    check:['pe_red_eye','pe_ocular_discharge'],
    expectDP:['赤目／眼脂パターン'],
    notDP:'眼痛パターン',
    expectCandAny:['結膜炎'],
    notPrimary:'結膜炎'},
  {name:'眼科23：STT低値＋眼脂→KCSが上位',
    check:['stt_low','pe_ocular_discharge'],
    expectDP:['角膜潰瘍パターン'],
    expectCandAny:['乾性角結膜炎（KCS・ドライアイ）']},
];

const ORTHO_TRAUMA_EYE_CASES = [
  {name:'眼窩1：眼球突出＋第三眼瞼突出＋開口痛→眼窩疾患パターン、眼窩疾患が上位',
    check:['pe_exophthalmos','pe_third_eyelid_protrusion','pe_oral_pain_opening'],
    expectDP:['眼窩疾患パターン'],
    expectCandAny:['眼窩疾患（膿瘍・蜂窩織炎・腫瘍）']},
  {name:'整形1：跛行単独→跛行パターン、前十字靭帯断裂primary固定しない',
    check:['pe_lameness'],
    expectDP:['跛行パターン'],
    expectCandAny:['軟部組織損傷・外傷','前十字靭帯断裂','骨折・関節脱臼（外傷）'],
    notPrimary:'前十字靭帯断裂'},
  {name:'整形2：非負重性跛行＋肢変形＋外傷歴→急性外傷パターン・骨折脱臼パターン、骨折/脱臼が上位',
    check:['pe_non_weight_bearing_lameness','pe_limb_deformity','pe_trauma_history'],
    expectDP:['急性外傷パターン','骨折・脱臼パターン'],
    expectPrimary:'骨折・関節脱臼（外傷）'},
  {name:'整形3：X線骨折→骨折・脱臼パターン、骨折がprimary',
    check:['rad_fracture'],
    expectDP:['骨折・脱臼パターン'],
    expectPrimary:'骨折・関節脱臼（外傷）'},
  {name:'整形4：X線脱臼→骨折・脱臼パターン、脱臼がprimary',
    check:['rad_luxation'],
    expectDP:['骨折・脱臼パターン'],
    expectPrimary:'骨折・関節脱臼（外傷）'},
  {name:'整形5：膝痛単独→膝関節跛行パターン、前十字靭帯断裂primary固定しない',
    check:['pe_stifle_pain'],
    expectDP:['膝関節跛行パターン'],
    expectCandAny:['前十字靭帯断裂','膝蓋骨脱臼','変形性関節症／股関節形成不全'],
    notPrimary:'前十字靭帯断裂'},
  {name:'整形6：膝痛＋cranial drawer陽性→膝関節跛行パターン、前十字靭帯断裂が候補として強まる',
    check:['pe_stifle_pain','pe_cranial_drawer_positive'],
    expectDP:['膝関節跛行パターン'],
    expectCandAny:['前十字靭帯断裂']},
  {name:'整形7：膝蓋骨脱臼触知→膝関節跛行パターン、膝蓋骨脱臼が候補',
    check:['pe_patellar_luxation'],
    expectDP:['膝関節跛行パターン'],
    expectCandAny:['膝蓋骨脱臼']},
  {name:'整形8：発熱＋多関節痛→多関節炎パターン、IMPA・感染性等が候補、IMPA primary固定しない',
    check:['f01','pe_multiple_joint_pain'],
    expectDP:['多関節炎パターン'],
    expectCandAny:['免疫介在性多発性関節炎（IMPA）'],
    notPrimary:'免疫介在性多発性関節炎（IMPA）'},
  {name:'整形9：多関節痛＋関節液好中球性→多関節炎パターン、IMPAが候補として強まる',
    check:['pe_multiple_joint_pain','cyto_joint_suppurative'],
    expectDP:['多関節炎パターン'],
    expectCandAny:['免疫介在性多発性関節炎（IMPA）']},
  {name:'整形10：関節液で細菌疑い→多関節炎パターン、感染性関節炎がprimary',
    check:['cyto_joint_septic'],
    expectDP:['多関節炎パターン'],
    expectPrimary:'感染性（敗血性）関節炎'},
  {name:'整形11：背部痛単独→脊椎痛・麻痺パターン、椎間板疾患primary固定しない',
    check:['pe_back_pain'],
    expectDP:['脊椎痛・麻痺パターン'],
    expectCandAny:['椎間板疾患・神経性跛行'],
    notPrimary:'椎間板疾患・神経性跛行'},
  {name:'整形12：背部痛＋後肢麻痺→脊椎痛・麻痺パターン、椎間板疾患が候補として強まる',
    check:['pe_back_pain','pe_hindlimb_paresis'],
    expectDP:['脊椎痛・麻痺パターン'],
    expectCandAny:['椎間板疾患・神経性跛行']},
  {name:'整形13：後肢麻痺＋冷感＋脈拍低下→猫大動脈血栓塞栓症パターンが発火、ATEが見逃したくない候補の筆頭、椎間板疾患に固定しない',
    check:['pe_hindlimb_paresis','pe_cold_extremity','pe_absent_pulse'],
    expectDP:['猫大動脈血栓塞栓症を疑うパターン'],
    expectCandAny:['大動脈血栓塞栓症（猫）'],
    notPrimary:'椎間板疾患・神経性跛行'},
  {name:'整形14：咬傷＋肢腫脹＋発熱→咬傷・膿瘍パターン、咬傷/膿瘍がprimary',
    check:['pe_wound_bite','pe_limb_swelling','f01'],
    expectDP:['咬傷・膿瘍パターン'],
    expectPrimary:'膿瘍・咬傷性腫脹'},
  {name:'整形15：外傷歴＋呼吸困難→急性外傷パターン、気胸がcritical_mimicとして候補',
    check:['pe_trauma_history','pe_dyspnea'],
    expectDP:['急性外傷パターン'],
    expectCandAny:['気胸']},
  {name:'整形16：外傷歴＋腹水＋貧血→急性外傷パターン、血腹（腹腔内出血）が候補',
    check:['pe_trauma_history','us_abd_effusion','cbc_hct_low'],
    expectDP:['急性外傷パターン'],
    expectCandAny:['心タンポナーデ・腹腔内出血（脾腫瘤破裂）']},
  {name:'整形17：肢腫脹＋骨融解→咬傷・膿瘍パターン、骨腫瘍が候補、骨折/外傷に固定しない',
    check:['pe_limb_swelling','rad_bone_lysis'],
    expectDP:['咬傷・膿瘍パターン'],
    expectCandAny:['骨腫瘍（骨肉腫）／骨髄炎'],
    notPrimary:'骨折・関節脱臼（外傷）'},
  {name:'整形18：交通事故歴単独→急性外傷パターン、骨折・脱臼等が候補として並列',
    check:['pe_road_traffic_accident'],
    expectDP:['急性外傷パターン'],
    expectCandAny:['骨折・関節脱臼（外傷）','軟部組織損傷・外傷']},
  {name:'整形19：咬傷単独→咬傷・膿瘍パターン、咬傷/膿瘍が候補',
    check:['pe_wound_bite'],
    expectDP:['咬傷・膿瘍パターン','急性外傷パターン'],
    expectCandAny:['膿瘍・咬傷性腫脹']},
];

const CHECKPOINT_A_FIX_CASES = [
  {name:'修正1-a：肢腫脹単独→咬傷・膿瘍primary固定しない、骨腫瘍/軟部組織/腫瘤系が候補として残る',
    check:['pe_limb_swelling'],
    expectCandAny:['膿瘍・咬傷性腫脹','骨腫瘍（骨肉腫）／骨髄炎','軟部組織損傷・外傷'],
    notPrimary:'膿瘍・咬傷性腫脹'},
  {name:'修正1-b：肢腫脹＋発熱→咬傷・膿瘍パターン、膿瘍・咬傷性腫脹がprimary',
    check:['pe_limb_swelling','f01'],
    expectDP:['咬傷・膿瘍パターン'],
    expectPrimary:'膿瘍・咬傷性腫脹'},
  {name:'修正2：多関節痛単独→多関節炎パターン、IMPA・感染性関節炎ともprimary固定しない',
    check:['pe_multiple_joint_pain'],
    expectDP:['多関節炎パターン'],
    expectCandAny:['免疫介在性多発性関節炎（IMPA）','感染性（敗血性）関節炎'],
    notPrimary:'免疫介在性多発性関節炎（IMPA）'},
  {name:'修正2-b：多関節痛単独→感染性関節炎もprimary固定しない',
    check:['pe_multiple_joint_pain'],
    expectDP:['多関節炎パターン'],
    notPrimary:'感染性（敗血性）関節炎'},
  {name:'修正3-a：非負重性跛行単独→跛行パターン、骨折・脱臼primary固定は避ける（外傷歴等なし）',
    check:['pe_non_weight_bearing_lameness'],
    expectDP:['跛行パターン'],
    notPrimary:'骨折・関節脱臼（外傷）'},
  {name:'修正3-b：非負重性跛行＋外傷歴→骨折・脱臼候補が上位（primary）',
    check:['pe_non_weight_bearing_lameness','pe_trauma_history'],
    expectDP:['急性外傷パターン'],
    expectPrimary:'骨折・関節脱臼（外傷）'},
];

const REPRO_CASES = [
  // --- 雌性生殖器 ---
  {name:'生殖1：膣分泌物単独→膣分泌物パターン、子宮蓄膿症primary固定しない',
    check:['pe_vaginal_discharge'],
    expectDP:['膣分泌物パターン'],
    expectCandAny:['膣・外陰部疾患','子宮蓄膿症'],
    notPrimary:'子宮蓄膿症'},
  {name:'生殖2：未避妊雌＋膿性膣分泌物＋発熱→子宮蓄膿症疑いパターン、子宮蓄膿症がprimary',
    check:['hx_intact_female','pe_vaginal_discharge_purulent','f01'],
    expectDP:['膣分泌物パターン','子宮蓄膿症疑いパターン'],
    expectPrimary:'子宮蓄膿症'},
  {name:'生殖3：未避妊雌＋子宮内液体＋白血球炎症→子宮蓄膿症がprimary',
    check:['hx_intact_female','us_uterine_fluid','cbc_neutrophilia','cbc_left_shift'],
    expectDP:['子宮蓄膿症を疑う画像パターン','子宮蓄膿症疑いパターン'],
    expectPrimary:'子宮蓄膿症'},
  {name:'生殖4：血様膣分泌物＋発情歴→膣分泌物パターン、子宮蓄膿症primary固定しない',
    check:['pe_vaginal_discharge_bloody','hx_recent_estrus'],
    expectDP:['膣分泌物パターン'],
    expectCandAny:['膣・外陰部疾患'],
    notPrimary:'子宮蓄膿症'},
  {name:'生殖5：膣腫瘤→膣分泌物パターン、子宮蓄膿症に固定しない',
    check:['pe_vaginal_mass'],
    expectDP:['膣分泌物パターン'],
    expectCandAny:['膣・外陰部疾患'],
    notPrimary:'子宮蓄膿症'},
  // --- 産科・周産期 ---
  {name:'生殖6：妊娠可能性＋難産→難産パターン、難産が上位',
    check:['hx_pregnant_possible','hx_dystocia'],
    expectDP:['難産パターン'],
    expectPrimary:'難産・産褥子宮疾患（難産・胎児遺残・子宮破裂・産後子宮炎）'},
  {name:'生殖7：胎児心拍消失→難産パターン、胎児死亡／胎児遺残が上位',
    check:['us_fetal_heartbeat_absent'],
    expectDP:['難産パターン'],
    expectPrimary:'難産・産褥子宮疾患（難産・胎児遺残・子宮破裂・産後子宮炎）'},
  {name:'生殖8：産後＋発熱＋乳腺痛→産後・授乳期パターン、乳腺炎が候補、産後子宮炎も候補',
    check:['hx_postpartum','f01','pe_mammary_pain'],
    expectDP:['産後・授乳期パターン'],
    expectCandAny:['乳腺炎'],
    notPrimary:'乳腺炎'},
  {name:'生殖9：授乳中＋低Ca→産後・授乳期パターン、低Ca血症／産褥テタニーが候補',
    check:['hx_lactating','elec_ica_low'],
    expectDP:['産後・授乳期パターン'],
    expectCandAny:['低Ca血症／産褥テタニー']},
  {name:'生殖10：偽妊娠歴＋乳腺腫脹→偽妊娠パターン、偽妊娠が候補、乳腺炎は未確認に残す',
    check:['hx_pseudopregnancy','pe_mammary_swelling'],
    expectDP:['偽妊娠パターン'],
    expectCandAny:['偽妊娠']},
  // --- 乳腺 ---
  {name:'生殖11：乳腺腫脹単独→乳腺腫瘤パターン、乳腺炎・乳腺腫瘍・偽妊娠が並列、乳腺腫瘍primary固定しない',
    check:['pe_mammary_swelling'],
    expectDP:['乳腺腫瘤パターン'],
    expectCandAny:['乳腺炎','上皮性腫瘍（扁平上皮癌・基底細胞腫等）','偽妊娠'],
    notPrimary:'上皮性腫瘍（扁平上皮癌・基底細胞腫等）'},
  {name:'生殖12：乳腺腫脹＋熱感＋発熱→乳腺腫瘤パターン、乳腺炎が候補',
    check:['pe_mammary_swelling','pe_mammary_heat','f01'],
    expectDP:['乳腺腫瘤パターン'],
    expectCandAny:['乳腺炎']},
  {name:'生殖13：乳腺腫瘤＋リンパ節腫大→乳腺腫瘤パターン、乳腺腫瘍が候補、乳腺炎も残る',
    check:['pe_mammary_mass','pe_ln_enlargement'],
    expectDP:['乳腺腫瘤パターン'],
    expectCandAny:['上皮性腫瘍（扁平上皮癌・基底細胞腫等）','乳腺炎']},
  // --- 雄性生殖器 ---
  {name:'生殖14：精巣腫瘤単独→精巣・陰嚢パターン、悪性primary固定しない',
    check:['pe_testicular_mass'],
    expectDP:['精巣・陰嚢パターン'],
    expectCandAny:['精巣・陰嚢疾患（腫瘍・精巣炎／精巣上体炎・精巣捻転・潜在精巣）'],
    notPrimary:'精巣・陰嚢疾患（腫瘍・精巣炎／精巣上体炎・精巣捻転・潜在精巣）'},
  {name:'生殖15：潜在精巣疑い＋精巣腫瘤→精巣・陰嚢パターン、潜在精巣腫瘍が候補として強まる',
    check:['pe_cryptorchid_suspected','pe_testicular_mass'],
    expectDP:['精巣・陰嚢パターン'],
    expectCandAny:['精巣・陰嚢疾患（腫瘍・精巣炎／精巣上体炎・精巣捻転・潜在精巣）']},
  {name:'生殖16：精巣痛＋陰嚢腫脹→精巣・陰嚢パターン、腫瘍に固定しない',
    check:['pe_testicular_pain','pe_scrotal_swelling'],
    expectDP:['精巣・陰嚢パターン'],
    expectCandAny:['精巣・陰嚢疾患（腫瘍・精巣炎／精巣上体炎・精巣捻転・潜在精巣）'],
    notPrimary:'精巣・陰嚢疾患（腫瘍・精巣炎／精巣上体炎・精巣捻転・潜在精巣）'},
  {name:'生殖17：未去勢雄＋前立腺腫大→前立腺パターン、前立腺腫瘍primary固定しない',
    check:['hx_intact_male','pe_rectal_prostate_enlarged'],
    expectDP:['前立腺パターン'],
    expectCandAny:['前立腺疾患（肥大・膿瘍・腫瘍）'],
    notPrimary:'前立腺疾患（肥大・膿瘍・腫瘍）'},
  {name:'生殖18：前立腺腫大＋発熱＋疼痛→前立腺パターン、前立腺炎／膿瘍が候補として強まる',
    check:['pe_rectal_prostate_enlarged','pe_prostatic_pain','f01'],
    expectDP:['前立腺パターン'],
    expectCandAny:['前立腺疾患（肥大・膿瘍・腫瘍）']},
  {name:'生殖19：前立腺細胞診で細菌→前立腺感染を強く疑う所見、前立腺炎／膿瘍がprimary',
    check:['cyto_prostatic_bacteria'],
    expectDP:['前立腺パターン','前立腺感染を強く疑う所見'],
    expectPrimary:'前立腺疾患（肥大・膿瘍・腫瘍）'},
  {name:'生殖20：包皮分泌物単独→包皮・陰茎パターン、尿道閉塞primary固定しない',
    check:['pe_preputial_discharge'],
    expectDP:['包皮・陰茎パターン'],
    expectCandAny:['包皮・陰茎疾患（包皮炎・陰茎腫瘤・嵌頓包茎）'],
    notPrimary:'尿道閉塞'},
  {name:'生殖21：嵌頓包茎→嵌頓包茎を強く疑う所見、嵌頓包茎がprimary・緊急度高め',
    check:['pe_paraphimosis'],
    expectDP:['包皮・陰茎パターン','嵌頓包茎を強く疑う所見'],
    expectPrimary:'包皮・陰茎疾患（包皮炎・陰茎腫瘤・嵌頓包茎）'},
  {name:'生殖22：包皮分泌物＋排尿困難→包皮・陰茎パターン、尿閉は乏尿等がない限りprimary固定しない',
    check:['pe_preputial_discharge','ua_stranguria'],
    expectDP:['包皮・陰茎パターン'],
    expectCandAny:['尿道閉塞','包皮・陰茎疾患（包皮炎・陰茎腫瘤・嵌頓包茎）'],
    notPrimary:'尿道閉塞'},
];

const REPRO_FIX_CASES = [
  {name:'5.51a修正1-a：未去勢雄単独→前立腺パターンを発火させない',
    check:['hx_intact_male'],
    notDP:'前立腺パターン',
    notPrimary:'前立腺疾患（肥大・膿瘍・腫瘍）'},
  {name:'5.51a修正1-b：未去勢雄＋前立腺腫大→前立腺パターン、前立腺腫瘍primary固定しない',
    check:['hx_intact_male','pe_rectal_prostate_enlarged'],
    expectDP:['前立腺パターン'],
    expectCandAny:['前立腺疾患（肥大・膿瘍・腫瘍）'],
    notPrimary:'前立腺疾患（肥大・膿瘍・腫瘍）'},
  {name:'5.51a修正2：未避妊雌＋発熱のみ→子宮蓄膿症はcritical_mimic候補、primary固定しない',
    check:['hx_intact_female','f01'],
    expectDP:['子宮蓄膿症疑いパターン'],
    expectCandAny:['子宮蓄膿症'],
    notPrimary:'子宮蓄膿症'},
  {name:'5.51a修正3-a：乳腺腫脹単独→乳腺腫瘤パターンのみ、産後・授乳期パターンは発火しない',
    check:['pe_mammary_swelling'],
    expectDP:['乳腺腫瘤パターン'],
    notDP:'産後・授乳期パターン',
    notPrimary:'上皮性腫瘍（扁平上皮癌・基底細胞腫等）'},
  {name:'5.51a修正3-b：授乳中＋乳腺腫脹→産後・授乳期パターン、乳腺炎・産褥テタニーが候補',
    check:['hx_lactating','pe_mammary_swelling'],
    expectDP:['産後・授乳期パターン'],
    expectCandAny:['乳腺炎','低Ca血症／産褥テタニー']},
];

const ENT_552_CASES = [
  // --- 口腔・歯科 ---
  {name:'ENT1：口臭単独→口腔・歯科疾患パターン、歯根膿瘍primary固定しない',
    check:['pe_halitosis'],
    expectDP:['口腔・歯科疾患パターン'],
    expectCandAny:['歯周病・口内炎','歯根膿瘍・歯折・顎骨病変'],
    notPrimary:'歯根膿瘍・歯折・顎骨病変'},
  {name:'ENT2：口腔痛＋歯折→口腔・歯科疾患パターン、歯折が候補',
    check:['pe_oral_pain','pe_tooth_fracture'],
    expectDP:['口腔・歯科疾患パターン'],
    expectCandAny:['歯根膿瘍・歯折・顎骨病変']},
  {name:'ENT3：顔面腫脹単独→顔面腫脹・顎腫脹パターン、歯根膿瘍primary固定しない',
    check:['pe_facial_swelling'],
    expectDP:['顔面腫脹・顎腫脹パターン'],
    expectCandAny:['歯根膿瘍・歯折・顎骨病変','上皮性腫瘍（扁平上皮癌・基底細胞腫等）','唾液嚢胞（ガマ腫）・舌下腫脹'],
    notPrimary:'歯根膿瘍・歯折・顎骨病変'},
  {name:'ENT4：顔面腫脹＋歯根膿瘍X線→歯根膿瘍がprimary',
    check:['pe_facial_swelling','rad_dental_root_abscess'],
    expectDP:['顔面腫脹・顎腫脹パターン','歯根膿瘍を強く疑う所見'],
    expectPrimary:'歯根膿瘍・歯折・顎骨病変'},
  {name:'ENT5：口腔内腫瘤単独→口腔内腫瘤・潰瘍パターン、悪性腫瘍primary固定しない',
    check:['pe_oral_mass'],
    expectDP:['口腔内腫瘤・潰瘍パターン'],
    expectCandAny:['上皮性腫瘍（扁平上皮癌・基底細胞腫等）'],
    notPrimary:'上皮性腫瘍（扁平上皮癌・基底細胞腫等）'},
  {name:'ENT6：口腔内腫瘤＋骨融解→口腔内腫瘤・潰瘍パターン、上皮性腫瘍が候補',
    check:['pe_oral_mass','rad_jaw_bone_lysis'],
    expectDP:['口腔内腫瘤・潰瘍パターン'],
    expectCandAny:['上皮性腫瘍（扁平上皮癌・基底細胞腫等）']},
  {name:'ENT7：舌下腫脹単独→舌下腫脹・唾液腺疾患パターン、唾液嚢胞primary固定しない',
    check:['pe_sublingual_swelling'],
    expectDP:['舌下腫脹・唾液腺疾患パターン'],
    expectCandAny:['唾液嚢胞（ガマ腫）・舌下腫脹'],
    notPrimary:'唾液嚢胞（ガマ腫）・舌下腫脹'},
  {name:'ENT8：猫口内炎パターン→口腔・歯科疾患パターン、歯周病・口内炎が候補',
    check:['pe_feline_stomatitis_pattern','pe_drooling'],
    expectDP:['口腔・歯科疾患パターン'],
    expectCandAny:['歯周病・口内炎']},
  // --- 鼻腔・鼻咽頭 ---
  {name:'ENT9：くしゃみ単独→鼻汁・くしゃみパターン、鼻腔腫瘍primary固定しない',
    check:['hx_sneezing'],
    expectDP:['鼻汁・くしゃみパターン'],
    expectCandAny:['猫上部気道感染症（FHV/FCV等）','鼻腔異物'],
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'ENT10：急性片側性鼻汁→鼻汁・くしゃみパターン、腫瘍primary固定しない',
    check:['pe_unilateral_nasal_discharge'],
    expectDP:['鼻汁・くしゃみパターン'],
    expectCandAny:['鼻腔異物','鼻腔腫瘍（腺癌・リンパ腫等）','鼻腔真菌症（アスペルギルス）'],
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'ENT11：血様鼻汁→鼻出血・血様鼻汁パターン、鼻腔腫瘍primary固定しない',
    check:['pe_bloody_nasal_discharge'],
    expectDP:['鼻出血・血様鼻汁パターン'],
    expectCandAny:['鼻腔腫瘍（腺癌・リンパ腫等）','鼻腔真菌症（アスペルギルス）'],
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'ENT12：鼻出血＋血小板減少→血小板減少を重要候補にする、鼻腔腫瘍に固定しない',
    check:['pe_epistaxis','cbc_platelet_low'],
    expectDP:['鼻出血・血様鼻汁パターン'],
    expectCandAny:['免疫介在性血小板減少症（ITP）'],
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'ENT13：片側性鼻汁＋鼻梁変形→慢性片側性鼻疾患パターン、腫瘍/真菌が候補',
    check:['pe_unilateral_nasal_discharge','pe_nasal_deformity'],
    expectDP:['慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン'],
    expectCandAny:['鼻腔腫瘍（腺癌・リンパ腫等）','鼻腔真菌症（アスペルギルス）']},
  {name:'ENT14：CT鼻腔腫瘤→鼻腔腫瘍がprimary',
    check:['ct_nasal_mass'],
    expectDP:['鼻腔腫瘤を強く疑う所見'],
    expectPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'ENT15：逆くしゃみ単独→鼻汁・くしゃみパターン、重症疾患primary固定しない',
    check:['pe_reverse_sneezing'],
    expectDP:['鼻汁・くしゃみパターン'],
    expectCandAny:['逆くしゃみ（発作性吸気）'],
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  // --- 耳・前庭 ---
  {name:'ENT16：耳痒み単独→外耳炎パターン、外耳炎primary固定しない',
    check:['pe_ear_pruritus'],
    expectDP:['外耳炎パターン'],
    expectCandAny:['外耳炎（耳の掻痒）'],
    notPrimary:'外耳炎（耳の掻痒）'},
  {name:'ENT17：耳痒み＋耳垢酵母→外耳炎パターン、外耳炎が候補',
    check:['pe_ear_pruritus','cyto_ear_yeast'],
    expectDP:['外耳炎パターン'],
    expectCandAny:['外耳炎（耳の掻痒）']},
  {name:'ENT18：耳血腫→耳血腫がprimary',
    check:['pe_aural_hematoma'],
    expectDP:['外耳炎パターン','耳血腫を強く疑う所見'],
    expectPrimary:'耳血腫・外耳道腫瘤'},
  {name:'ENT19：耳痛＋鼓膜異常→外耳炎パターン、中耳炎・内耳炎が候補',
    check:['pe_ear_pain','otoscopy_tm_abnormal'],
    expectDP:['外耳炎パターン'],
    expectCandAny:['中耳炎・内耳炎（otitis media/interna）']},
  {name:'ENT20：前庭症状＋中耳CT所見→前庭症状パターン、中耳炎・内耳炎が候補',
    check:['pe_head_tilt','ct_middle_ear_soft_tissue'],
    expectDP:['前庭症状パターン（末梢／中枢の鑑別）','外耳炎パターン'],
    expectCandAny:['中耳炎・内耳炎（otitis media/interna）']},
  // --- 咽喉頭・上気道 ---
  {name:'ENT21：吸気性喘鳴単独→咽喉頭・上気道パターン、上気道閉塞/喉頭麻痺が候補',
    check:['pe_stridor'],
    expectDP:['咽喉頭・上気道パターン'],
    expectCandAny:['咽頭・喉頭疾患（喉頭麻痺等）','上気道閉塞（喉頭麻痺・短頭種気道症候群）']},
  {name:'ENT22：声の変化＋吸気性喘鳴→咽喉頭・上気道パターン、喉頭麻痺が候補',
    check:['pe_voice_change','pe_stridor'],
    expectDP:['咽喉頭・上気道パターン'],
    expectCandAny:['咽頭・喉頭疾患（喉頭麻痺等）']},
  {name:'ENT23：えずき＋嚥下困難→咽喉頭・上気道パターン、気管虚脱primary固定しない',
    check:['pe_gagging','pe_dysphagia'],
    expectDP:['咽喉頭・上気道パターン'],
    expectCandAny:['口腔・顎関節・神経疾患による嚥下障害'],
    notPrimary:'気管虚脱'},
  {name:'ENT24：吸気性喘鳴＋呼吸困難→上気道閉塞をcritical_mimicとして提示',
    check:['pe_stridor','pe_dyspnea'],
    expectDP:['咽喉頭・上気道パターン','呼吸困難の緊急パターン'],
    expectCandAny:['上気道閉塞（喉頭麻痺・短頭種気道症候群）']},
];

const ENT_552A_CASES = [
  {name:'ENT25：流涎単独→口腔・歯科疾患パターンのみ、舌下腫脹・唾液腺疾患パターンは発火しない',
    check:['pe_drooling'],
    expectDP:['口腔・歯科疾患パターン'],
    notDP:'舌下腫脹・唾液腺疾患パターン',
    notPrimary:'唾液嚢胞（ガマ腫）・舌下腫脹'},
  {name:'ENT26：舌下腫脹単独→舌下腫脹・唾液腺疾患パターン、唾液嚢胞primary固定しない',
    check:['pe_sublingual_swelling'],
    expectDP:['舌下腫脹・唾液腺疾患パターン'],
    expectCandAny:['唾液嚢胞（ガマ腫）・舌下腫脹'],
    notPrimary:'唾液嚢胞（ガマ腫）・舌下腫脹'},
  {name:'ENT27：舌下腫脹＋流涎→舌下腫脹・唾液腺疾患パターン、唾液嚢胞が候補として強まる',
    check:['pe_sublingual_swelling','pe_drooling'],
    expectDP:['舌下腫脹・唾液腺疾患パターン'],
    expectCandAny:['唾液嚢胞（ガマ腫）・舌下腫脹'],
    notPrimary:'唾液嚢胞（ガマ腫）・舌下腫脹'},
  {name:'ENT28：耳痒み単独→外耳炎パターン、中耳炎・内耳炎をcritical_mimic表示しない',
    check:['pe_ear_pruritus'],
    expectDP:['外耳炎パターン'],
    expectCandAny:['外耳炎（耳の掻痒）'],
    notPrimary:'外耳炎（耳の掻痒）',
    notCriticalMimic:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'ENT29：耳痛単独→外耳炎パターン、中耳炎・内耳炎はconditional程度、critical_mimic表示しない',
    check:['pe_ear_pain'],
    expectDP:['外耳炎パターン'],
    notCriticalMimic:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'ENT30：耳痛＋鼓膜異常→中耳炎・内耳炎が上位候補',
    check:['pe_ear_pain','otoscopy_tm_abnormal'],
    expectCandAny:['中耳炎・内耳炎（otitis media/interna）'],
    expectPrimary:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'ENT31：前庭症状＋中耳CT所見→前庭症状パターン、中耳炎・内耳炎が上位候補',
    check:['pe_head_tilt','ct_middle_ear_soft_tissue'],
    expectDP:['前庭症状パターン（末梢／中枢の鑑別）'],
    expectCandAny:['中耳炎・内耳炎（otitis media/interna）'],
    expectPrimary:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'ENT32：片側性鼻汁単独→鼻汁・くしゃみパターン、慢性片側性鼻疾患パターンは発火しない',
    check:['pe_unilateral_nasal_discharge'],
    expectDP:['鼻汁・くしゃみパターン'],
    notDP:'慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン',
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'ENT33：片側性鼻汁＋鼻梁変形→慢性片側性鼻疾患パターン、腫瘍/真菌が候補',
    check:['pe_unilateral_nasal_discharge','pe_nasal_deformity'],
    expectDP:['慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン'],
    expectCandAny:['鼻腔腫瘍（腺癌・リンパ腫等）','鼻腔真菌症（アスペルギルス）']},
];

const TOX_553_CASES = [
  {name:'TOX1：中毒曝露歴のみ→中毒曝露疑いパターン、特定中毒primary固定しない',
    check:['hx_toxin_exposure_known'],
    expectDP:['中毒曝露疑いパターン'],
    expectCandAny:['中毒・薬剤'],
    notPrimary:'中毒・薬剤'},
  {name:'TOX2：人薬誤飲→中毒曝露疑いパターン、薬物中毒が候補',
    check:['hx_human_medication_ingestion'],
    expectDP:['中毒曝露疑いパターン'],
    expectCandAny:['中毒・薬剤'],
    notPrimary:'中毒・薬剤'},
  {name:'TOX3：殺鼠剤曝露歴のみ→中毒曝露疑いパターン、出血性疾患primary固定しない',
    check:['hx_rodenticide_exposure'],
    expectDP:['中毒曝露疑いパターン','抗凝固性殺鼠剤中毒パターン'],
    expectCandAny:['抗凝固性殺鼠剤中毒'],
    notPrimary:'抗凝固性殺鼠剤中毒'},
  {name:'TOX4：殺鼠剤曝露＋PT/APTT延長→抗凝固性殺鼠剤中毒が上位',
    check:['hx_rodenticide_exposure','coag_both_long'],
    expectDP:['抗凝固性殺鼠剤中毒を強く疑う所見'],
    expectPrimary:'抗凝固性殺鼠剤中毒'},
  {name:'TOX5：鼻出血＋PT/APTT延長→凝固異常/抗凝固性殺鼠剤/DICを候補、鼻腔腫瘍primary固定しない',
    check:['pe_epistaxis','coag_both_long'],
    expectDP:['鼻出血・血様鼻汁パターン'],
    expectCandAny:['抗凝固性殺鼠剤中毒','DIC（播種性血管内凝固）'],
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'TOX6：振戦単独→神経毒・振戦/発作パターン、特定中毒primary固定しない',
    check:['f15'],
    expectDP:['神経毒・振戦/発作パターン'],
    notPrimary:'メトアルデヒド中毒'},
  {name:'TOX7：メトアルデヒド曝露＋振戦→メトアルデヒド中毒が候補',
    check:['hx_metaldehyde_ingestion','f15'],
    expectDP:['神経毒・振戦/発作パターン'],
    expectCandAny:['メトアルデヒド中毒']},
  {name:'TOX8：有機リン曝露＋縮瞳＋流涎→有機リン中毒が候補、流涎単独で唾液腺疾患に寄せない',
    check:['hx_organophosphate_exposure','pe_miosis','pe_drooling'],
    expectDP:['神経毒・振戦/発作パターン'],
    expectCandAny:['有機リン／カーバメート／ピレスロイド中毒'],
    notDP:'舌下腫脹・唾液腺疾患パターン'},
  {name:'TOX9：発作＋低血糖→低血糖を上位、中毒primary固定しない',
    check:['f14','chem_glucose_low'],
    expectCandAny:['代謝性（低血糖・肝性脳症・電解質）'],
    notPrimary:'メトアルデヒド中毒'},
  {name:'TOX10：NSAIDs誤飲＋嘔吐→嘔吐・下痢主体の中毒パターン、消化管閉塞primary固定しない',
    check:['hx_nsaid_ingestion','f05'],
    expectDP:['嘔吐・下痢主体の中毒パターン'],
    expectCandAny:['NSAIDs中毒'],
    notPrimary:'消化管異物・閉塞'},
  {name:'TOX11：ブドウ/レーズン曝露＋高窒素血症→腎毒性中毒パターン、ブドウ/レーズン中毒とAKIが候補',
    check:['hx_grape_raisin_ingestion','chem_bun_high','chem_crea_high'],
    expectDP:['腎毒性中毒パターン'],
    expectCandAny:['ブドウ／レーズン中毒','急性腎障害（AKI）']},
  {name:'TOX12：チョコレート曝露＋振戦→神経毒・振戦/発作パターン、チョコレート／カフェイン中毒が候補',
    check:['hx_chocolate_caffeine_ingestion','f15'],
    expectDP:['神経毒・振戦/発作パターン'],
    expectCandAny:['チョコレート／カフェイン／テオブロミン中毒']},
  {name:'TOX13：キシリトール曝露＋低血糖→キシリトール中毒が候補、低血糖を見逃さない',
    check:['hx_xylitol_ingestion','chem_glucose_low'],
    expectCandAny:['キシリトール中毒','代謝性（低血糖・肝性脳症・電解質）']},
  {name:'TOX14：アセトアミノフェン曝露＋茶褐色粘膜→溶血・メトヘモグロビン中毒パターン、アセトアミノフェン中毒が候補',
    check:['hx_acetaminophen_ingestion','pe_cyanosis_brown_mucosa'],
    expectDP:['溶血・メトヘモグロビン中毒パターン'],
    expectCandAny:['アセトアミノフェン中毒']},
  {name:'TOX15：たまねぎ曝露＋ハインツ小体→溶血・メトヘモグロビン中毒パターン、たまねぎ／ネギ中毒が候補',
    check:['hx_allium_ingestion','cbc_heinz_bodies'],
    expectDP:['溶血・メトヘモグロビン中毒パターン'],
    expectCandAny:['たまねぎ／ネギ中毒']},
  {name:'TOX16：エチレングリコール曝露＋CaOx結晶＋代謝性アシドーシス→エチレングリコール中毒が上位',
    check:['hx_ethylene_glycol_ingestion','ua_crystalluria_oxalate','abg_met_acidosis'],
    expectDP:['エチレングリコール中毒を強く疑う所見'],
    expectPrimary:'エチレングリコール中毒'},
  {name:'TOX17：暑熱曝露＋高体温＋虚脱→熱中症が上位、DIC/ショックを候補に残す',
    check:['hx_heat_exposure','pe_hyperthermia','pe_collapse_shock'],
    expectDP:['熱中症を強く疑う所見'],
    expectPrimary:'熱中症・高体温'},
  {name:'TOX18：高体温単独→熱中症は候補、暑熱曝露なしではprimary固定しない',
    check:['pe_hyperthermia'],
    expectDP:['熱中症・環境性高体温パターン'],
    expectCandAny:['熱中症・高体温'],
    notPrimary:'熱中症・高体温'},
  {name:'TOX19：煙吸入＋呼吸困難→煙吸入・一酸化炭素中毒パターン、呼吸困難の緊急パターン',
    check:['hx_smoke_inhalation','pe_dyspnea'],
    expectDP:['煙吸入・一酸化炭素中毒パターン','呼吸困難の緊急パターン'],
    expectCandAny:['煙吸入／気道熱傷・一酸化炭素中毒']},
  {name:'TOX20：感電＋口腔内熱傷→感電・溺水が候補',
    check:['hx_electrical_injury','pe_burn_oral_electrical'],
    expectCandAny:['感電・溺水']},
  {name:'TOX21：溺水＋低酸素→呼吸困難の緊急パターンと矛盾しない',
    check:['hx_near_drowning','abg_hypoxemia'],
    expectCandAny:['感電・溺水']},
  {name:'TOX22：虫刺され＋虚脱→アナフィラキシーを上位またはcritical_mimic',
    check:['hx_insect_sting','pe_collapse_shock'],
    expectDP:['蜂刺症・蛇咬傷・アナフィラキシーパターン'],
    expectCandAny:['アナフィラキシー']},
  {name:'TOX23：蛇咬傷＋局所腫脹→蛇咬傷が候補、咬傷・膿瘍primary固定しない',
    check:['hx_snake_bite','pe_local_swelling_pain'],
    expectDP:['蜂刺症・蛇咬傷・アナフィラキシーパターン'],
    expectCandAny:['蜂刺症・虫刺され・蛇咬傷'],
    notPrimary:'膿瘍・咬傷性腫脹'},
];

const TOX_553A_CASES = [
  {name:'TOXA1：嘔吐単独→中毒パターン発火なし/中毒候補を強く出さない',
    check:['f05'],
    notDP:'嘔吐・下痢主体の中毒パターン'},
  {name:'TOXA2：下痢単独→中毒パターン発火なし/特定中毒固定しない',
    check:['f06'],
    notDP:'嘔吐・下痢主体の中毒パターン'},
  {name:'TOXA3：NSAIDs誤飲＋嘔吐→NSAIDs中毒が候補、ブドウ中毒branch固定しない、消化管閉塞primary固定しない',
    check:['hx_nsaid_ingestion','f05'],
    expectDP:['嘔吐・下痢主体の中毒パターン'],
    expectCandAny:['NSAIDs中毒'],
    notPrimary:'消化管異物・閉塞'},
  {name:'TOXA4：高窒素血症のみ→腎毒性中毒パターンは発火しない、ブドウ中毒branch表示しない',
    check:['chem_bun_high','chem_crea_high'],
    notDP:'腎毒性中毒パターン'},
  {name:'TOXA5：シュウ酸カルシウム結晶のみ→エチレングリコール中毒primary固定しない',
    check:['ua_crystalluria_oxalate'],
    notPrimary:'エチレングリコール中毒'},
  {name:'TOXA6：エチレングリコール曝露＋CaOx結晶＋代謝性アシドーシス→エチレングリコール中毒primary（TOX16維持）',
    check:['hx_ethylene_glycol_ingestion','ua_crystalluria_oxalate','abg_met_acidosis'],
    expectDP:['エチレングリコール中毒を強く疑う所見'],
    expectPrimary:'エチレングリコール中毒'},
  {name:'TOXA7：アセトアミノフェン曝露＋茶褐色粘膜→アセトアミノフェン中毒が上位、たまねぎ中毒branch固定しない',
    check:['hx_acetaminophen_ingestion','pe_cyanosis_brown_mucosa'],
    expectPrimary:'アセトアミノフェン中毒'},
  {name:'TOXA8：たまねぎ曝露＋ハインツ小体→たまねぎ中毒が上位、アセトアミノフェン中毒branch固定しない',
    check:['hx_allium_ingestion','cbc_heinz_bodies'],
    expectPrimary:'たまねぎ／ネギ中毒'},
  {name:'TOXA9：局所腫脹疼痛単独→アナフィラキシーcritical_mimic/primary固定しない、咬傷・膿瘍等を候補',
    check:['pe_local_swelling_pain'],
    notPrimary:'アナフィラキシー',
    notCriticalMimic:'アナフィラキシー',
    expectCandAny:['膿瘍・咬傷性腫脹']},
  {name:'TOXA10：虫刺され＋虚脱→アナフィラキシーを上位またはcritical_mimic（TOX22維持）',
    check:['hx_insect_sting','pe_collapse_shock'],
    expectDP:['蜂刺症・蛇咬傷・アナフィラキシーパターン'],
    expectCandAny:['アナフィラキシー']},
  {name:'TOXA11：蛇咬傷＋局所腫脹→蛇咬傷が候補、咬傷・膿瘍primary固定しない（TOX23維持）',
    check:['hx_snake_bite','pe_local_swelling_pain'],
    expectCandAny:['蜂刺症・虫刺され・蛇咬傷'],
    notPrimary:'膿瘍・咬傷性腫脹'},
  {name:'TOXA12：黄疸単独→中毒性肝障害を強く出しすぎない、アセトアミノフェン/キシリトールbranch/primary固定しない',
    check:['chem_bilirubin_high'],
    notDP:'中毒性肝障害パターン',
    notPrimary:'アセトアミノフェン中毒'},
  {name:'TOXA13：ALT高値単独→中毒性肝障害はconditional程度、特定中毒primary/branch固定しない',
    check:['chem_alt_high'],
    notDP:'中毒性肝障害パターン',
    notPrimary:'中毒性肝障害'},
  {name:'TOXA14a：5.52a保護テスト（流涎単独→唾液腺疾患パターン発火なし）',
    check:['pe_drooling'],
    notDP:'舌下腫脹・唾液腺疾患パターン'},
  {name:'TOXA14b：5.52a保護テスト（耳痒み単独→中耳炎critical_mimic表示なし）',
    check:['pe_ear_pruritus'],
    notCriticalMimic:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'TOXA14c：5.52a保護テスト（片側性鼻汁単独→慢性片側性鼻疾患パターン発火なし）',
    check:['pe_unilateral_nasal_discharge'],
    notDP:'慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン'},
];

const TOX_553B_CASES = [
  {name:'TOXB1：NSAIDs誤飲＋嘔吐→NSAIDs中毒が候補、他毒物をbranch表示しない、消化管閉塞primary固定しない',
    check:['hx_nsaid_ingestion','f05'],
    expectDP:['嘔吐・下痢主体の中毒パターン'],
    expectCandAny:['NSAIDs中毒'],
    notPrimary:'消化管異物・閉塞',
    notRoleAny:[
      {name:'ブドウ／レーズン中毒', role:'branch'},
      {name:'たまねぎ／ネギ中毒', role:'branch'},
      {name:'チョコレート／カフェイン／テオブロミン中毒', role:'branch'}
    ]},
  {name:'TOXB2：ブドウ/レーズン曝露＋高窒素血症→ブドウ中毒が候補/上位、NSAIDs中毒branch表示しない、エチレングリコールprimary/branch表示しない',
    check:['hx_grape_raisin_ingestion','chem_bun_high','chem_crea_high'],
    expectDP:['腎毒性中毒パターン'],
    expectCandAny:['ブドウ／レーズン中毒'],
    notRoleAny:[
      {name:'NSAIDs中毒', role:'branch'},
      {name:'エチレングリコール中毒', role:'branch'},
      {name:'エチレングリコール中毒', role:'primary'}
    ]},
  {name:'TOXB3：NSAIDs曝露＋高窒素血症→NSAIDs中毒とAKIが候補、ブドウ中毒branch表示しない、エチレングリコールprimary/branch表示しない',
    check:['hx_nsaid_ingestion','chem_bun_high','chem_crea_high'],
    expectCandAny:['NSAIDs中毒','急性腎障害（AKI）'],
    notRoleAny:[
      {name:'ブドウ／レーズン中毒', role:'branch'},
      {name:'エチレングリコール中毒', role:'branch'},
      {name:'エチレングリコール中毒', role:'primary'}
    ]},
  {name:'TOXB4：シュウ酸カルシウム結晶単独→エチレングリコールprimary固定しない、ブドウ/NSAIDs中毒branch表示しない',
    check:['ua_crystalluria_oxalate'],
    notPrimary:'エチレングリコール中毒',
    notRoleAny:[
      {name:'ブドウ／レーズン中毒', role:'branch'},
      {name:'NSAIDs中毒', role:'branch'}
    ]},
  {name:'TOXB5：エチレングリコール曝露＋CaOx結晶→エチレングリコールprimary、ブドウ中毒branch表示しない',
    check:['hx_ethylene_glycol_ingestion','ua_crystalluria_oxalate'],
    expectDP:['エチレングリコール中毒を強く疑う所見'],
    expectPrimary:'エチレングリコール中毒',
    notRoleAny:[{name:'ブドウ／レーズン中毒', role:'branch'}]},
  {name:'TOXB6：アセトアミノフェン曝露＋茶褐色粘膜→アセトアミノフェン中毒が上位、たまねぎ中毒branch表示しない',
    check:['hx_acetaminophen_ingestion','pe_cyanosis_brown_mucosa'],
    expectPrimary:'アセトアミノフェン中毒',
    notRoleAny:[{name:'たまねぎ／ネギ中毒', role:'branch'}]},
  {name:'TOXB7：たまねぎ曝露＋ハインツ小体→たまねぎ中毒が上位、アセトアミノフェン/NSAIDs中毒branch表示しない',
    check:['hx_allium_ingestion','cbc_heinz_bodies'],
    expectPrimary:'たまねぎ／ネギ中毒',
    notRoleAny:[
      {name:'アセトアミノフェン中毒', role:'branch'},
      {name:'NSAIDs中毒', role:'branch'}
    ]},
  {name:'TOXB8：局所腫脹疼痛単独→咬傷・膿瘍は出てよい、アナフィラキシーcritical_mimic表示しない、蛇咬傷/蜂刺症をbranch以上で強く出しすぎない',
    check:['pe_local_swelling_pain'],
    expectCandAny:['膿瘍・咬傷性腫脹'],
    notCriticalMimic:'アナフィラキシー',
    notRoleAny:[{name:'蜂刺症・虫刺され・蛇咬傷', role:'branch'}]},
  {name:'TOXB9：蛇咬傷＋局所腫脹→蛇咬傷が候補、咬傷・膿瘍primary固定しない、アナフィラキシーcritical_mimic表示しない',
    check:['hx_snake_bite','pe_local_swelling_pain'],
    expectCandAny:['蜂刺症・虫刺され・蛇咬傷'],
    notPrimary:'膿瘍・咬傷性腫脹',
    notCriticalMimic:'アナフィラキシー'},
  {name:'TOXB10：虫刺され＋虚脱→アナフィラキシーcritical_mimicまたは上位候補、蜂刺症も候補',
    check:['hx_insect_sting','pe_collapse_shock'],
    expectDP:['アナフィラキシー（虫刺され＋虚脱）を強く疑う所見'],
    expectCandAny:['アナフィラキシー']},
  {name:'TOXB11a：5.52a保護テスト（流涎単独→唾液腺疾患パターン発火なし）',
    check:['pe_drooling'],
    notDP:'舌下腫脹・唾液腺疾患パターン'},
  {name:'TOXB11b：5.52a保護テスト（耳痒み単独→中耳炎critical_mimic表示なし）',
    check:['pe_ear_pruritus'],
    notCriticalMimic:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'TOXB11c：5.52a保護テスト（片側性鼻汁単独→慢性片側性鼻疾患パターン発火なし）',
    check:['pe_unilateral_nasal_discharge'],
    notDP:'慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン'},
];

const AUDIT_554_CASES = [
  // --- 5.54A: 非特異的所見単独テスト ---
  {name:'5.54A-1：発熱単独→DP発火なし（特定疾患primary固定なし）',
    check:['f01'],
    notDP:'高窒素血症'},
  {name:'5.54A-2：嘔吐単独→中毒パターン発火なし',
    check:['f05'],
    notDP:'嘔吐・下痢主体の中毒パターン'},
  {name:'5.54A-3：下痢単独→中毒パターン発火なし',
    check:['f06'],
    notDP:'嘔吐・下痢主体の中毒パターン'},
  {name:'5.54A-4：高窒素血症のみ→CKD primary固定しない（尿比重等が必要）',
    check:['chem_bun_high','chem_crea_high'],
    expectDP:['高窒素血症'],
    expectCandAny:['慢性腎臓病'],
    notPrimary:'慢性腎臓病'},
  {name:'5.54A-5：黄疸単独→中毒性肝障害を強く出しすぎない',
    check:['chem_bilirubin_high'],
    notDP:'中毒性肝障害パターン',
    notPrimary:'アセトアミノフェン中毒'},
  {name:'5.54A-6：ALT高値単独→特定中毒primary/branch固定しない',
    check:['chem_alt_high'],
    notDP:'中毒性肝障害パターン',
    notPrimary:'中毒性肝障害'},
  {name:'5.54A-7：腹水単独→敗血症性腹膜炎/尿腹症/胆汁性腹膜炎をcritical_mimic表示しない',
    check:['us_abd_effusion'],
    notCriticalMimic:'敗血症・閉鎖腔感染',
    notRoleAny:[
      {name:'尿腹症', role:'critical_mimic'},
      {name:'胆汁性腹膜炎', role:'critical_mimic'}
    ]},
  {name:'5.54A-8：リンパ節腫大のみ→リンパ腫primary固定しない',
    check:['pe_ln_enlargement'],
    notPrimary:'リンパ腫・リンパ節転移'},
  {name:'5.54A-9：皮膚/皮下腫瘤のみ→良性primary固定しない',
    check:['pe_cutaneous_mass'],
    notPrimary:'良性腫瘤（脂肪腫等）'},
  {name:'5.54A-10：局所腫脹疼痛のみ→アナフィラキシーcritical_mimic表示しない',
    check:['pe_local_swelling_pain'],
    notCriticalMimic:'アナフィラキシー'},
  // --- 5.54B: 既存修正保護テスト ---
  {name:'5.54B-1：流涎単独→唾液腺疾患パターン発火なし（5.52a保護）',
    check:['pe_drooling'],
    notDP:'舌下腫脹・唾液腺疾患パターン'},
  {name:'5.54B-2：耳痒み単独→中耳炎critical_mimic表示なし（5.52a保護）',
    check:['pe_ear_pruritus'],
    notCriticalMimic:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'5.54B-3：片側鼻汁単独→慢性鼻疾患パターン発火なし（5.52a保護）',
    check:['pe_unilateral_nasal_discharge'],
    notDP:'慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン'},
  {name:'5.54B-4：未去勢雄単独→前立腺パターン発火なし（5.51a保護）',
    check:['hx_intact_male'],
    notDP:'前立腺パターン'},
  {name:'5.54B-5：未避妊雌＋発熱のみ→子宮蓄膿症primary固定しない（5.51a保護）',
    check:['hx_intact_female','f01'],
    notPrimary:'子宮蓄膿症'},
  {name:'5.54B-6：乳腺腫脹単独→産褥テタニーcritical_mimic表示しない',
    check:['pe_mammary_swelling'],
    notDP:'産後・授乳期パターン',
    notCriticalMimic:'低Ca血症／産褥テタニー'},
  {name:'5.54B-7：非負重性跛行単独→骨折primary固定しない（5.50a保護）',
    check:['pe_non_weight_bearing_lameness'],
    notPrimary:'骨折・関節脱臼（外傷）'},
  {name:'5.54B-8：肢腫脹単独→膿瘍primary固定しない（5.50a保護）',
    check:['pe_limb_swelling'],
    notPrimary:'膿瘍・咬傷性腫脹'},
  {name:'5.54B-9：多関節痛単独→感染性関節炎primary固定しない（5.50a保護）',
    check:['pe_multiple_joint_pain'],
    notPrimary:'感染性（敗血性）関節炎'},
  {name:'5.54B-10：局所腫脹疼痛単独→咬傷・膿瘍primary固定しない',
    check:['pe_local_swelling_pain'],
    notPrimary:'膿瘍・咬傷性腫脹'},
  // --- 5.54C: confirmed DP保護テスト（弱めすぎて重要疾患が上がらなくなっていないことの確認） ---
  {name:'5.54C-1：子宮蓄膿症confirmed（膿性分泌物＋発熱）→primary',
    check:['hx_intact_female','pe_vaginal_discharge_purulent','f01'],
    expectPrimary:'子宮蓄膿症'},
  {name:'5.54C-2：産褥テタニーconfirmed（授乳中＋イオン化Ca低下）→critical_mimic',
    check:['hx_lactating','elec_ica_low'],
    expectDP:['低Ca血症／産褥テタニーを強く疑う所見（イオン化Ca）'],
    expectRoleAny:[{name:'低Ca血症／産褥テタニー', role:'critical_mimic'}]},
  {name:'5.54C-3：中耳炎confirmed（耳痛＋鼓膜異常）→上位候補',
    check:['pe_ear_pain','otoscopy_tm_abnormal'],
    expectCandAny:['中耳炎・内耳炎（otitis media/interna）']},
  {name:'5.54C-4：NSAIDs中毒confirmed（誤飲＋嘔吐）→候補',
    check:['hx_nsaid_ingestion','f05'],
    expectCandAny:['NSAIDs中毒']},
  {name:'5.54C-5：ブドウ/レーズン中毒confirmed（誤飲＋高窒素血症）→branch以上',
    check:['hx_grape_raisin_ingestion','chem_bun_high','chem_crea_high'],
    expectRoleAny:[{name:'ブドウ／レーズン中毒', role:'branch'}]},
  {name:'5.54C-6：EG中毒confirmed（誤飲＋CaOx結晶）→primary',
    check:['hx_ethylene_glycol_ingestion','ua_crystalluria_oxalate'],
    expectPrimary:'エチレングリコール中毒'},
  {name:'5.54C-7：アナフィラキシーconfirmed（虫刺され＋虚脱）→critical_mimic',
    check:['hx_insect_sting','pe_collapse_shock'],
    expectRoleAny:[{name:'アナフィラキシー', role:'critical_mimic'}]},
  {name:'5.54C-8：尿道閉塞confirmed（排尿困難＋膀胱拡張＋高K）→primary',
    check:['ua_stranguria','pe_large_bladder','elec_k_high'],
    expectPrimary:'尿道閉塞'},
  {name:'5.54C-9：DKAconfirmed（高血糖＋ケトン＋代謝性アシドーシス）→primary',
    check:['chem_glucose_high','ua_ketonuria','abg_met_acidosis'],
    expectPrimary:'糖尿病性ケトアシドーシス（DKA）'},
  {name:'5.54C-10：敗血症性体腔炎confirmed（細胞内細菌）→primary',
    check:['fluid_intracellular_bacteria'],
    expectPrimary:'化膿性腹膜炎'},
];

const AUDIT_554A_CASES = [
  {name:'AUDIT1：局所腫脹疼痛単独→膿瘍conditional程度、敗血症/アナフィラキシーcritical_mimic表示しない、蛇咬傷/蜂刺されをbranch以上で強く出さない',
    check:['pe_local_swelling_pain'],
    notCriticalMimic:'敗血症・閉鎖腔感染',
    notRoleAny:[
      {name:'アナフィラキシー', role:'critical_mimic'},
      {name:'蜂刺症・虫刺され・蛇咬傷', role:'branch'},
      {name:'蜂刺症・虫刺され・蛇咬傷', role:'primary'},
      {name:'膿瘍・咬傷性腫脹', role:'branch'},
      {name:'膿瘍・咬傷性腫脹', role:'primary'}
    ]},
  {name:'AUDIT2：肢腫脹単独→敗血症critical_mimic表示しない、膿瘍primary/branch固定しない',
    check:['pe_limb_swelling'],
    notCriticalMimic:'敗血症・閉鎖腔感染',
    notRoleAny:[
      {name:'膿瘍・咬傷性腫脹', role:'branch'},
      {name:'膿瘍・咬傷性腫脹', role:'primary'}
    ]},
  {name:'AUDIT3：肢腫脹＋発熱/好中球増多→膿瘍/感染性炎症が上位、敗血症はcritical_mimic可',
    check:['pe_limb_swelling','f01','cbc_neutrophilia'],
    expectDP:['肢腫脹＋感染徴候パターン'],
    expectPrimary:'膿瘍・咬傷性腫脹',
    expectRoleAny:[{name:'敗血症・閉鎖腔感染', role:'critical_mimic'}]},
  {name:'AUDIT4：咬傷創＋発熱→咬傷/膿瘍がbranch以上、感染性合併症を重要候補',
    check:['pe_bite_puncture_wound','f01'],
    expectDP:['咬傷創＋全身感染徴候パターン'],
    expectRoleAny:[
      {name:'膿瘍・咬傷性腫脹', role:'branch'},
      {name:'膿瘍・咬傷性腫脹', role:'primary'}
    ]},
  {name:'AUDIT5：排尿困難単独→FIC/UTI/尿石/尿道閉塞を並列、FIC primary固定せず尿道閉塞もprimary固定しない',
    check:['ua_stranguria'],
    expectCandAny:['特発性膀胱炎（FIC）','尿路感染症（UTI）','尿石症','尿道閉塞'],
    notPrimary:'特発性膀胱炎（FIC）'},
  {name:'AUDIT6：排尿困難＋膀胱拡張＋高K→尿道閉塞をprimary/critical_mimic、FIC primary固定しない、高K血症も上がる',
    check:['ua_stranguria','us_bladder_distended','elec_k_high'],
    expectDP:['尿路閉塞／閉塞性腎後性高窒素血症','高K血症／高K性不整脈リスク'],
    expectRoleAny:[
      {name:'尿道閉塞', role:'primary'},
      {name:'尿道閉塞', role:'critical_mimic'}
    ],
    notPrimary:'特発性膀胱炎（FIC）'},
  {name:'AUDIT7：膀胱拡張＋高K→尿道閉塞を重要候補、FIC primary固定しない',
    check:['us_bladder_distended','elec_k_high'],
    expectDP:['尿路閉塞／閉塞性腎後性高窒素血症'],
    expectRoleAny:[
      {name:'尿道閉塞', role:'primary'},
      {name:'尿道閉塞', role:'critical_mimic'}
    ],
    notPrimary:'特発性膀胱炎（FIC）'},
  {name:'AUDIT8：閉塞confirmed既存パターン（排尿困難＋膀胱拡張＋乏尿無尿）→尿道閉塞primary',
    check:['ua_stranguria','us_bladder_distended','ua_oliguria_anuria'],
    expectPrimary:'尿道閉塞'},
  {name:'AUDIT9：腹水単独→化膿性腹膜炎/尿腹症/胆汁性腹膜炎をcritical_mimic表示しない',
    check:['us_abd_effusion'],
    notRoleAny:[
      {name:'化膿性腹膜炎', role:'critical_mimic'},
      {name:'尿腹症', role:'critical_mimic'},
      {name:'胆汁性腹膜炎', role:'critical_mimic'}
    ]},
  {name:'AUDIT10：産後/授乳＋低Ca→産褥テタニーをcritical_mimic',
    check:['hx_lactating','elec_ica_low'],
    expectRoleAny:[{name:'低Ca血症／産褥テタニー', role:'critical_mimic'}]},
];

const REDTEAM_555_CASES = [
  // --- 消化器・肝胆膵 ---
  {name:'RT1：犬 急性反復嘔吐＋腹痛＋小腸拡張→消化管異物・閉塞が上位、急性胃腸炎に固定しない',
    check:['hx_repeated_vomiting','pe_abdominal_pain','rad_si_dilation'],
    expectPrimary:'消化管異物・閉塞',
    expectCandAny:['膵炎']},
  {name:'RT2：犬 膵炎マーカー高値＋膵周囲炎症→膵炎primary、消化管閉塞primary固定しない',
    check:['spec_cpl_fpl_high','us_pancreas_inflam'],
    expectPrimary:'膵炎',
    notPrimary:'消化管異物・閉塞'},
  {name:'RT3：猫 慢性嘔吐＋体重減少＋腸管壁肥厚→慢性腸症/リンパ腫が候補',
    check:['f03','us_gi_wall_thick'],
    expectCandAny:['慢性腸症（CE／IBD・蛋白漏出性腸症）','消化管型リンパ腫／腫瘍']},
  {name:'RT4：猫 黄疸＋食欲不振持続＋肥満＋ALP優位→肝リピドーシスが上位、胆道閉塞primary固定しない',
    check:['chem_bilirubin_high','hx_anorexia_persistent','hx_obesity_or_overweight','chem_alp_high','chem_alp_ggt_disproportion_cat'],
    expectPrimary:'猫肝リピドーシス',
    notPrimary:'胆道閉塞・胆嚢粘液嚢腫'},
  {name:'RT5：猫 黄疸＋発熱＋好中球増多＋胆管拡張→胆道閉塞/胆管炎/膵炎胆道圧迫が候補、肝リピドーシスprimary固定しない',
    check:['chem_bilirubin_high','f01','cbc_neutrophilia','us_bileduct_dilation'],
    expectCandAny:['胆道閉塞・胆嚢粘液嚢腫','胆管炎・胆管肝炎（猫）','膵炎による胆道圧迫'],
    notPrimary:'猫肝リピドーシス'},
  // --- 泌尿器・腎 ---
  {name:'RT6：雄猫 排尿困難＋膀胱拡張＋高K→尿道閉塞primary、FIC primary固定しない、高K上がる',
    check:['ua_stranguria','us_bladder_distended','elec_k_high'],
    expectPrimary:'尿道閉塞',
    expectDP:['高K血症／高K性不整脈リスク'],
    notPrimary:'特発性膀胱炎（FIC）'},
  {name:'RT7：排尿困難のみ→FIC/UTI/尿石/尿道閉塞が並列、FIC・尿道閉塞ともprimary固定しない',
    check:['ua_stranguria'],
    expectCandAny:['特発性膀胱炎（FIC）','尿路感染症（UTI）','尿石症','尿道閉塞'],
    notPrimary:'特発性膀胱炎（FIC）',
    notRoleAny:[{name:'尿道閉塞', role:'primary'}]},
  {name:'RT8：高窒素血症＋尿比重低下→CKD/AKIが候補、尿道閉塞primary固定しない、中毒性腎障害branch表示しない',
    check:['chem_bun_high','chem_crea_high','ua_usg_low'],
    expectCandAny:['慢性腎臓病','急性腎障害（AKI）'],
    notPrimary:'尿道閉塞',
    notBranch:'エチレングリコール中毒'},
  {name:'RT9：腎盂拡張＋尿管拡張→上部尿路閉塞パターン、尿石症が候補',
    check:['us_renal_pelvis_dilation','us_ureter_dilation'],
    expectDP:['上部尿路閉塞を疑う画像パターン'],
    expectCandAny:['尿石症']},
  // --- 内分泌・代謝 ---
  {name:'RT10：高血糖＋ケトン尿＋代謝性アシドーシス→DKA primary',
    check:['chem_glucose_high','ua_ketonuria','abg_met_acidosis'],
    expectPrimary:'糖尿病性ケトアシドーシス（DKA）'},
  {name:'RT11：低Na＋高K＋Na/K低下→アジソン病primary、尿道閉塞primary固定しない',
    check:['elec_na_low','elec_k_high','elec_nak_low'],
    expectPrimary:'副腎皮質機能低下症（アジソン病）',
    notPrimary:'尿道閉塞'},
  {name:'RT12：授乳中＋低Ca→産褥テタニーcritical_mimic、乳腺炎primary固定しない',
    check:['hx_lactating','elec_ica_low'],
    expectRoleAny:[{name:'低Ca血症／産褥テタニー', role:'critical_mimic'}],
    notPrimary:'乳腺炎'},
  // --- 呼吸・循環・救急 ---
  {name:'RT13：呼吸困難＋肺胞パターン＋左房拡大→心原性肺水腫が上位、肺炎primary固定しない',
    check:['f21','rad_alveolar','echo_la_enlargement'],
    expectPrimary:'心原性肺水腫／うっ血性心不全',
    notPrimary:'肺炎・肺腫瘍'},
  {name:'RT14：呼吸困難＋気胸X線→気胸がprimary、心不全primary固定しない',
    check:['f21','rad_pneumothorax'],
    expectPrimary:'気胸',
    notPrimary:'心原性肺水腫／うっ血性心不全'},
  {name:'RT15：虚脱＋血性腹水＋貧血→血腹/血胸パターン、腫瘍性出血/腹腔内出血が候補、化膿性腹膜炎primary固定しない',
    check:['f20','fluid_hemorrhagic','cbc_hct_low'],
    expectDP:['血腹／血胸'],
    expectCandAny:['腫瘍性出血（血管肉腫・腹腔内出血）','心タンポナーデ・腹腔内出血（脾腫瘤破裂）'],
    notPrimary:'化膿性腹膜炎'},
  {name:'RT16：細胞内細菌を伴う体腔液→敗血症性体腔炎、化膿性腹膜炎primary',
    check:['fluid_intracellular_bacteria'],
    expectDP:['敗血症性体腔炎'],
    expectPrimary:'化膿性腹膜炎'},
  {name:'RT17：腹水単独→化膿性腹膜炎/尿腹症/胆汁性腹膜炎をcritical_mimic表示しない',
    check:['us_abd_effusion'],
    notRoleAny:[
      {name:'化膿性腹膜炎', role:'critical_mimic'},
      {name:'尿腹症', role:'critical_mimic'},
      {name:'胆汁性腹膜炎', role:'critical_mimic'}
    ]},
  // --- 神経・血液・体腔液 ---
  {name:'RT18：発作＋低血糖→低血糖を上位候補、特定中毒primary固定しない',
    check:['f14','chem_glucose_low'],
    expectRoleAny:[{name:'代謝性（低血糖・肝性脳症・電解質）', role:'critical_mimic'}],
    notPrimary:'メトアルデヒド中毒'},
  {name:'RT19：重度貧血→重度貧血・循環不全パターン、貧血/出血が候補',
    check:['cbc_hct_critical'],
    expectDP:['重度貧血・循環不全パターン'],
    expectPrimary:'貧血・出血'},
  {name:'RT20：Dダイマー高値＋血小板減少→DIC/凝固障害パターン、DICが候補',
    check:['coag_ddimer_high','cbc_platelet_low'],
    expectDP:['多因子性凝固障害／DIC疑い'],
    expectPrimary:'DIC（播種性血管内凝固）'},
  // --- 皮膚・腫瘤・整形外科 ---
  {name:'RT21：皮膚/皮下腫瘤のみ→良性/悪性/炎症性が並列、良性腫瘤primary固定しない',
    check:['pe_cutaneous_mass'],
    expectDP:['皮膚・皮下腫瘤パターン'],
    notPrimary:'良性（脂肪腫・組織球腫・嚢胞）'},
  {name:'RT22：肥満細胞腫疑い細胞診→肥満細胞腫が上位、脂肪腫primary固定しない',
    check:['pe_cutaneous_mass','cyto_mast_cells'],
    expectRoleAny:[{name:'肥満細胞腫', role:'critical_mimic'},{name:'肥満細胞腫', role:'primary'}],
    notPrimary:'良性（脂肪腫・組織球腫・嚢胞）'},
  {name:'RT23：非負重性跛行単独→骨折primary固定しない、外傷歴なしでは急性外傷パターンを出しすぎない',
    check:['pe_non_weight_bearing_lameness'],
    notPrimary:'骨折・関節脱臼（外傷）',
    notDP:'急性外傷パターン'},
  {name:'RT24：非負重性跛行＋外傷歴→骨折が上位、敗血症primary固定しない',
    check:['pe_non_weight_bearing_lameness','pe_trauma_history'],
    expectPrimary:'骨折・関節脱臼（外傷）',
    notPrimary:'敗血症・閉鎖腔感染'},
  {name:'RT25：肢腫脹単独→膿瘍primary/branch固定しない、敗血症critical_mimic表示しない',
    check:['pe_limb_swelling'],
    notCriticalMimic:'敗血症・閉鎖腔感染',
    notRoleAny:[{name:'膿瘍・咬傷性腫脹', role:'branch'},{name:'膿瘍・咬傷性腫脹', role:'primary'}]},
  {name:'RT26：肢腫脹＋発熱＋好中球増多→膿瘍/感染性炎症が上位、敗血症critical_mimicも可',
    check:['pe_limb_swelling','f01','cbc_neutrophilia'],
    expectPrimary:'膿瘍・咬傷性腫脹',
    expectRoleAny:[{name:'敗血症・閉鎖腔感染', role:'critical_mimic'}]},
  // --- 生殖器・乳腺 ---
  {name:'RT27：未避妊雌＋発熱のみ→子宮蓄膿症primary固定しない',
    check:['hx_intact_female','f01'],
    notPrimary:'子宮蓄膿症'},
  {name:'RT28：未避妊雌＋膿性膣分泌物＋発熱→子宮蓄膿症primary',
    check:['hx_intact_female','pe_vaginal_discharge_purulent','f01'],
    expectPrimary:'子宮蓄膿症'},
  {name:'RT29：乳腺腫脹単独→乳腺腫瘍primary固定しない、産褥テタニーcritical_mimic表示しない',
    check:['pe_mammary_swelling'],
    notPrimary:'上皮性腫瘍（扁平上皮癌・基底細胞腫等）',
    notCriticalMimic:'低Ca血症／産褥テタニー'},
  {name:'RT30：授乳中＋乳腺腫脹＋発熱→乳腺炎が候補、産褥テタニーcritical_mimic固定しない(低Caなし)',
    check:['hx_lactating','pe_mammary_swelling','f01'],
    expectCandAny:['乳腺炎'],
    notCriticalMimic:'低Ca血症／産褥テタニー'},
  // --- 口腔・ENT ---
  {name:'RT31：流涎単独→口腔/歯科疾患パターンは出てよい、唾液腺疾患パターンは出さない',
    check:['pe_drooling'],
    expectDP:['口腔・歯科疾患パターン'],
    notDP:'舌下腫脹・唾液腺疾患パターン'},
  {name:'RT32：舌下腫脹＋流涎→唾液腺疾患パターン、唾液嚢胞候補、primary固定しすぎない',
    check:['pe_sublingual_swelling','pe_drooling'],
    expectDP:['舌下腫脹・唾液腺疾患パターン'],
    expectCandAny:['唾液嚢胞（ガマ腫）・舌下腫脹'],
    notPrimary:'唾液嚢胞（ガマ腫）・舌下腫脹'},
  {name:'RT33：耳痒み単独→外耳炎/アレルギー/寄生虫が候補、中耳炎critical_mimic表示なし',
    check:['pe_ear_pruritus'],
    expectCandAny:['外耳炎（耳の掻痒）'],
    notCriticalMimic:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'RT34：耳痛＋鼓膜異常→中耳炎が上位',
    check:['pe_ear_pain','otoscopy_tm_abnormal'],
    expectPrimary:'中耳炎・内耳炎（otitis media/interna）'},
  {name:'RT35：片側鼻汁単独→鼻汁/くしゃみパターン、慢性鼻疾患パターンは出さない、鼻腔腫瘍primary固定しない',
    check:['pe_unilateral_nasal_discharge'],
    expectDP:['鼻汁・くしゃみパターン'],
    notDP:'慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン',
    notPrimary:'鼻腔腫瘍（腺癌・リンパ腫等）'},
  {name:'RT36：片側鼻汁＋鼻梁変形→慢性鼻疾患パターン、腫瘍/真菌が候補',
    check:['pe_unilateral_nasal_discharge','pe_nasal_deformity'],
    expectDP:['慢性片側性鼻疾患／鼻腔腫瘍・真菌疑いパターン'],
    expectCandAny:['鼻腔腫瘍（腺癌・リンパ腫等）','鼻腔真菌症（アスペルギルス）']},
  // --- 中毒・環境救急 ---
  {name:'RT37：NSAIDs誤飲＋嘔吐→NSAIDs中毒が候補、他毒物をbranch表示しない',
    check:['hx_nsaid_ingestion','f05'],
    expectCandAny:['NSAIDs中毒'],
    notRoleAny:[
      {name:'ブドウ／レーズン中毒', role:'branch'},
      {name:'たまねぎ／ネギ中毒', role:'branch'},
      {name:'チョコレート／カフェイン／テオブロミン中毒', role:'branch'}
    ]},
  {name:'RT38：ブドウ/レーズン曝露＋高窒素血症→ブドウ中毒が上位、NSAIDs/EGをbranch表示しない',
    check:['hx_grape_raisin_ingestion','chem_bun_high','chem_crea_high'],
    expectRoleAny:[{name:'ブドウ／レーズン中毒', role:'branch'}],
    notRoleAny:[
      {name:'NSAIDs中毒', role:'branch'},
      {name:'エチレングリコール中毒', role:'branch'},
      {name:'エチレングリコール中毒', role:'primary'}
    ]},
  {name:'RT39：エチレングリコール曝露＋CaOx結晶→エチレングリコール中毒primary',
    check:['hx_ethylene_glycol_ingestion','ua_crystalluria_oxalate'],
    expectPrimary:'エチレングリコール中毒'},
  {name:'RT40：虫刺され＋虚脱→アナフィラキシーcritical_mimicまたは上位、蜂刺症も候補',
    check:['hx_insect_sting','pe_collapse_shock'],
    expectRoleAny:[{name:'アナフィラキシー', role:'critical_mimic'}],
    expectCandAny:['蜂刺症・虫刺され・蛇咬傷']},
  {name:'RT41：蛇咬傷＋局所腫脹→蛇咬傷が候補、アナフィラキシーcritical_mimic表示しない、膿瘍primary固定しない',
    check:['hx_snake_bite','pe_local_swelling_pain'],
    expectCandAny:['蜂刺症・虫刺され・蛇咬傷'],
    notCriticalMimic:'アナフィラキシー',
    notPrimary:'膿瘍・咬傷性腫脹'},
  {name:'RT42：暑熱曝露＋高体温＋虚脱→熱中症が上位、DICをcritical_mimicにしすぎない',
    check:['hx_heat_exposure','pe_hyperthermia','pe_collapse_shock'],
    expectPrimary:'熱中症・高体温',
    notCriticalMimic:'DIC（播種性血管内凝固）'},
];

const PHASE2_CASES = [
  {name:'Phase2-1：DP名称変更確認（再生性貧血パターン）',
    check:['cbc_hct_low','cbc_retic_high'],
    expectDP:['再生性貧血パターン']},
  {name:'Phase2-2：DP名称変更確認（腎機能低下・濃縮不全パターン）',
    check:['chem_bun_high','chem_crea_high','ua_usg_low'],
    expectDP:['腎機能低下・濃縮不全パターン']},
  {name:'Phase2-3：confirmed DP保護（子宮蓄膿症、5.51と同内容）',
    check:['hx_intact_female','pe_vaginal_discharge_purulent','f01'],
    expectPrimary:'子宮蓄膿症'},
  {name:'Phase2-4：support separation保護（尿道閉塞confirmed、既存腎泌尿器1と同内容）',
    check:['ua_stranguria','pe_large_bladder','elec_k_high'],
    expectPrimary:'尿道閉塞'},
];

// Phase 3b: 治療欄の救急初期対応・禁忌表現を静的に検査するテスト（診断候補の発火テストではない）
const TREATMENT_SAFETY_3B_CASES = [
  {name:'TS3B-1：尿道閉塞（高K/不整脈/電解質＋鎮静麻酔前評価）',
    card_id:'dysuria_urethral_obstruction',
    any1:['高K','不整脈','電解質'],
    any2:['鎮静','麻酔'],
    any3:['FIC','特発性膀胱炎','閉塞解除','循環安定化']},
  {name:'TS3B-2：DKA（インスリン＋K/電解質＋モニタ/再検）',
    card_id:'vomit_diabetic_ketoacidosis',
    any1:['インスリン'],
    any2:['K','カリウム','電解質'],
    any3:['モニタ','再検']},
  {name:'TS3B-3：気胸（酸素＋胸腔穿刺/脱気＋ストレス/安静）',
    card_id:'dyspnea_pneumothorax',
    any1:['酸素'],
    any2:['胸腔穿刺','脱気'],
    any3:['ストレス','安静']},
  {name:'TS3B-4：心原性肺水腫（酸素＋フロセミド＋輸液注意）',
    card_id:'cough_cardiogenic_pulmonary_edema_chf',
    any1:['酸素'],
    any2:['フロセミド'],
    any3:['輸液','利尿']},
  {name:'TS3B-5：アナフィラキシー（エピネフリン＋気道/呼吸/循環＋抗ヒスタミン等が主治療ではない）',
    card_id:'collapse_anaphylaxis',
    any1:['エピネフリン'],
    any2:['気道','呼吸','循環'],
    any3:['主治療','置き換わる','代替']},
  {name:'TS3B-6：熱中症（冷却＋過冷却注意＋DIC/凝固/腎障害/電解質）',
    card_id:'collapse_heat_stroke_hyperthermia',
    any1:['冷却'],
    any2:['過冷却','冷やしすぎ'],
    any3:['凝固','DIC','腎障害','電解質']},
  {name:'TS3B-7：急性緑内障（眼圧＋禁忌/水晶体脱臼/角膜潰瘍＋緊急/紹介）',
    card_id:'eye_acute_glaucoma',
    any1:['眼圧'],
    any2:['禁忌','水晶体脱臼','角膜潰瘍'],
    any3:['緊急','紹介']},
];

// Phase 3c: 抗菌薬適正使用の安全化を静的に検査するテスト（診断候補の発火テストではない）
const ANTIMICROBIAL_STEWARDSHIP_3C_CASES = [
  {name:'AS3C-1：化膿性腹膜炎（培養/感受性＋外科/ソースコントロール＋de-escalation/狭域化/培養結果）',
    card_id:'fever_septic_peritonitis',
    any1:['培養','感受性'],
    any2:['外科','ソースコントロール','洗浄'],
    any3:['de-escalation','狭域化','培養結果','デエスカレーション']},
  {name:'AS3C-2：敗血症・閉鎖腔感染（培養/採材＋遅らせない/速やか＋de-escalation/狭域化）',
    card_id:'fever_sepsis_closed-space_infection',
    any1:['培養','採材'],
    any2:['遅らせない','速やか'],
    any3:['de-escalation','狭域化','デエスカレーション']},
  {name:'AS3C-3：UTI（尿培養/培養＋感受性＋無症候性/routine回避/症状がある場合）',
    card_id:'dysuria_urinary_tract_infection',
    any1:['尿培養','培養'],
    any2:['感受性'],
    any3:['無症候性','routine使用を避ける','症状がある場合']},
  {name:'AS3C-4：腎盂腎炎（尿培養/培養＋感受性＋再評価/培養結果/期間は固定しない）',
    card_id:'pupd_pyelonephritis',
    any1:['尿培養','培養'],
    any2:['感受性'],
    any3:['再評価','培養結果','期間は固定しない']},
  {name:'AS3C-5：誤嚥性肺炎（酸素/呼吸状態＋培養/気道洗浄＋重症度/経験的）',
    card_id:'cough_aspiration_pneumonia',
    any1:['酸素','呼吸状態'],
    any2:['培養','気道洗浄'],
    any3:['重症度','経験的']},
  {name:'AS3C-6：急性出血性下痢症/AHDS（抗菌薬/抗生剤＋原則不要/routine/敗血症徴候）',
    card_id:'sb_diarrhea_acute_hemorrhagic_diarrhea',
    any1:['抗菌薬','抗生剤'],
    any2:['原則不要','routine','敗血症兆候','敗血症徴候']},
  {name:'AS3C-7：膿皮症・マラセチア（外用/局所＋培養＋再発/深在性/難治）',
    card_id:'pruritus_pyoderma_malassezia',
    any1:['外用','局所'],
    any2:['培養'],
    any3:['再発','深在性','難治']},
  {name:'AS3C-8：外耳炎（耳鏡/鼓膜＋耳垢/細胞診＋培養/難治）',
    card_id:'pruritus_otitis_externa',
    any1:['耳鏡','鼓膜'],
    any2:['耳垢','細胞診'],
    any3:['培養','難治']},
  {name:'AS3C-9：胆管炎・胆管肝炎（培養/胆汁培養＋好中球性/リンパ球性＋ステロイド/免疫抑制＋感染除外前のステロイド注意）',
    card_id:'jaundice_cholangitis_cat',
    any1:['培養','胆汁培養'],
    any2:['好中球性','リンパ球性'],
    any3:['ステロイド','免疫抑制']},
  {name:'AS3C-10：膿瘍・咬傷性腫脹（排膿/ドレナージ/洗浄＋抗菌薬＋培養/感受性/深部感染）',
    card_id:'mass_abscess_bite_wound',
    any1:['排膿','ドレナージ','洗浄'],
    any2:['抗菌薬'],
    any3:['培養','感受性','深部感染']},
];

// Phase 3d: NSAIDs/ステロイド/鎮痛薬の安全化を静的に検査するテスト（診断候補の発火テストではない）
const NSAID_STEROID_ANALGESIC_3D_CASES = [
  {name:'NS3D-1：軟部組織損傷・外傷（NSAIDs＋腎/脱水/消化管＋ステロイド併用回避）',
    card_id:'lameness_soft_tissue_trauma',
    any1:['NSAIDs','非ステロイド'],
    any2:['腎','脱水','消化管'],
    any3:['ステロイド併用','併用は避ける']},
  {name:'NS3D-2：変形性関節症（NSAIDs＋腎/肝/モニタ＋長期/定期的/再評価）',
    card_id:'lameness_osteoarthritis_hip_dysplasia',
    any1:['NSAIDs','非ステロイド'],
    any2:['腎','肝','モニタ'],
    any3:['長期','定期的','再評価']},
  {name:'NS3D-3：膵炎（NSAIDs＋脱水/腎/消化管＋回避/慎重）',
    card_id:'vomit_pancreatitis',
    any1:['NSAIDs','非ステロイド'],
    any2:['脱水','腎','消化管'],
    any3:['回避','慎重']},
  {name:'NS3D-4：胃炎・胃潰瘍（NSAIDs＋ステロイド＋併用/避ける/禁忌）',
    card_id:'vomit_gastritis_gastric_ulcer',
    any1:['NSAIDs'],
    any2:['ステロイド'],
    any3:['併用','避ける','禁忌']},
  {name:'NS3D-5：慢性腸症（ステロイド＋感染/寄生虫/リンパ腫＋除外/診断/確認)',
    card_id:'sb_diarrhea_chronic_enteropathy_ple',
    any1:['ステロイド'],
    any2:['感染','寄生虫','リンパ腫'],
    any3:['除外','診断','確認']},
  {name:'NS3D-6：消化管型リンパ腫（ステロイド＋診断前/細胞診/病理＋精度/診断/専門）',
    card_id:'sb_diarrhea_alimentary_lymphoma',
    any1:['ステロイド'],
    any2:['診断前','細胞診','病理'],
    any3:['精度','診断','専門']},
  {name:'NS3D-7：IMPA（ステロイド＋感染性関節炎/感染＋除外/関節液/培養）',
    card_id:'lameness_immune-mediated_polyarthritis',
    any1:['ステロイド'],
    any2:['感染性関節炎','感染'],
    any3:['除外','関節液','培養']},
  {name:'NS3D-8：ITP（ステロイド＋感染/腫瘍/二次性＋モニタ/再検/出血）',
    card_id:'bleeding_immune_thrombocytopenia',
    any1:['ステロイド'],
    any2:['感染','腫瘍','二次性'],
    any3:['モニタ','再検','出血']},
  {name:'NS3D-9：猫大動脈血栓塞栓症（鎮痛/オピオイド＋抗血栓/クロピドグレル＋専門/モニタ/用量はPhase 3g）',
    card_id:'collapse_feline_aortic_thromboembolism',
    any1:['鎮痛','オピオイド'],
    any2:['抗血栓','クロピドグレル'],
    any3:['専門','モニタ','用量はPhase 3g']},
  {name:'NS3D-10：皮膚型リンパ腫（ステロイド＋診断前/病理/細胞診＋診断精度/専門/確定診断）',
    card_id:'pruritus_epitheliotropic_lymphoma',
    any1:['ステロイド'],
    any2:['診断前','病理','細胞診'],
    any3:['診断精度','専門','確定診断']},
  {name:'NS3D-11：MUO（ステロイド/免疫抑制＋感染/感染性＋除外/MRI/脳脊髄液）',
    card_id:'ataxia_meningoencephalitis_of_unknown_origin',
    any1:['ステロイド','免疫抑制'],
    any2:['感染','感染性'],
    any3:['除外','MRI','脳脊髄液']},
  {name:'NS3D-12：肥満細胞腫（抗ヒスタミン/制酸/脱顆粒＋細胞診/病理/診断＋専門/外科/マージン）',
    card_id:'mass_mast_cell_tumor',
    any1:['抗ヒスタミン','制酸','脱顆粒'],
    any2:['細胞診','病理','診断'],
    any3:['専門','外科','マージン']},
];

// Phase 3e: 内分泌・電解質・中毒薬剤用量の安全化を静的に検査するテスト（診断候補の発火テストではない）
const ENDO_ELECTROLYTE_TOXIN_3E_CASES = [
  {name:'ET3E-1：DKA（インスリン＋K/電解質＋モニタ/再検/再評価＋輸液）',
    card_id:'vomit_diabetic_ketoacidosis',
    any1:['インスリン'],
    any2:['K','カリウム','電解質'],
    any3:['モニタ','再検','再評価'],
    any4:['輸液']},
  {name:'ET3E-2：糖尿病（インスリン＋血糖/グルコース＋モニタ/再検/曲線）',
    card_id:'pupd_diabetes_mellitus',
    any1:['インスリン'],
    any2:['血糖','グルコース'],
    any3:['モニタ','再検','曲線']},
  {name:'ET3E-3：代謝性発作/低血糖（低血糖/ブドウ糖＋Ca/カルシウム＋心電図/モニタ）',
    card_id:'seizure_metabolic',
    any1:['低血糖','ブドウ糖'],
    any2:['Ca','カルシウム'],
    any3:['心電図','モニタ']},
  {name:'ET3E-4：電解質異常（K/カリウム＋Na/ナトリウム/Ca/カルシウム＋速度/心電図/再検）',
    card_id:'pupd_electrolyte_disorders',
    any1:['K','カリウム'],
    any2:['Na','ナトリウム','Ca','カルシウム'],
    any3:['速度','心電図','再検']},
  {name:'ET3E-5：尿道閉塞（高K＋心電図/不整脈＋鎮静/麻酔）',
    card_id:'dysuria_urethral_obstruction',
    any1:['高K'],
    any2:['心電図','不整脈'],
    any3:['鎮静','麻酔']},
  {name:'ET3E-6：エチレングリコール中毒（4-メチルピラゾール/エタノール/解毒薬＋用量記載またはPhase 3g/成書/院内プロトコル＋腎/AKI/モニタ）※Phase 3gで4-MP用量を反映済み',
    card_id:'vomit_ethylene_glycol_toxicosis',
    any1:['4-メチルピラゾール','エタノール','解毒薬'],
    any2:['Phase 3g','成書','院内プロトコル','20mg/kg','125mg/kg'],
    any3:['腎','AKI','モニタ']},
  {name:'ET3E-7：アセトアミノフェン中毒（N-アセチルシステイン/NAC＋用量記載またはPhase 3g/成書/院内プロトコル＋メトヘモグロビン/肝/酸素）※Phase 3gでNAC用量を反映済み',
    card_id:'jaundice_acetaminophen_toxicosis',
    any1:['N-アセチルシステイン','NAC'],
    any2:['Phase 3g','成書','院内プロトコル','140mg/kg','70mg/kg'],
    any3:['メトヘモグロビン','肝','酸素']},
  {name:'ET3E-8：キシリトール中毒（ブドウ糖/グルコース＋低血糖＋モニタ/再検）',
    card_id:'vomit_xylitol_toxicosis',
    any1:['ブドウ糖','グルコース'],
    any2:['低血糖'],
    any3:['モニタ','再検']},
  {name:'ET3E-9：抗凝固性殺鼠剤中毒（ビタミンK＋PT/凝固＋再検/モニタ）',
    card_id:'bleeding_anticoagulant_rodenticide_toxicosis',
    any1:['ビタミンK'],
    any2:['PT','凝固'],
    any3:['再検','モニタ']},
  {name:'ET3E-10：アナフィラキシー（エピネフリン＋Phase 3g/成書/院内プロトコル＋気道/呼吸/循環）',
    card_id:'collapse_anaphylaxis',
    any1:['エピネフリン'],
    any2:['Phase 3g','成書','院内プロトコル'],
    any3:['気道','呼吸','循環']},
  {name:'ET3E-11：猫ATE（鎮痛/オピオイド＋抗血栓/クロピドグレル＋Phase 3g/専門/モニタ）',
    card_id:'collapse_feline_aortic_thromboembolism',
    any1:['鎮痛','オピオイド'],
    any2:['抗血栓','クロピドグレル'],
    any3:['Phase 3g','専門','モニタ']},
  {name:'ET3E-12：心原性肺水腫（フロセミド＋酸素＋輸液/前負荷/モニタ）',
    card_id:'cough_cardiogenic_pulmonary_edema_chf',
    any1:['フロセミド'],
    any2:['酸素'],
    any3:['輸液','前負荷','モニタ']},
];

// Phase 3f: 治療欄文言統一を静的に検査するテスト（診断候補の発火テストではない、複数card_idを横断確認）
const TREATMENT_WORDING_3F_CASES = [
  {name:'TW3F-1：用量保留表現の統一（Phase 3g＋成書/院内プロトコル、中毒カードは中毒相談窓口も）※EG中毒/アセトアミノフェン中毒はPhase 3gで用量を反映済みのため個別確認',
    cards:[
      {card_id:'collapse_anaphylaxis', isToxin:false},
      {card_id:'collapse_feline_aortic_thromboembolism', isToxin:false},
    ],
    any1:['Phase 3g'],
    any2:['成書','院内プロトコル'],
    toxinAny:['中毒相談窓口','中毒相談']},
  {name:'TW3F-1b：用量を反映した中毒カードの確認（EG中毒4-MP用量、アセトアミノフェン中毒NAC用量）',
    cards:[
      {card_id:'vomit_ethylene_glycol_toxicosis', isToxin:false},
      {card_id:'jaundice_acetaminophen_toxicosis', isToxin:false},
    ],
    any1:['4-メチルピラゾール','N-アセチルシステイン'],
    any2:['mg/kg']},
  {name:'TW3F-2：NSAIDs＋ステロイド併用注意の統一',
    cards:[{card_id:'lameness_soft_tissue_trauma'},{card_id:'vomit_gastritis_gastric_ulcer'}],
    any1:['NSAIDs'],
    any2:['ステロイド'],
    any3:['併用','原則避ける']},
  {name:'TW3F-3：感染除外前ステロイド注意の統一',
    cards:[{card_id:'sb_diarrhea_chronic_enteropathy_ple'},{card_id:'lameness_immune-mediated_polyarthritis'},{card_id:'jaundice_cholangitis_cat'}],
    any1:['ステロイド'],
    any2:['感染','感染性'],
    any3:['除外','確認']},
  {name:'TW3F-4：診断前ステロイド注意の統一',
    cards:[{card_id:'sb_diarrhea_alimentary_lymphoma'},{card_id:'pruritus_epitheliotropic_lymphoma'}],
    any1:['診断前'],
    any2:['ステロイド'],
    any3:['細胞診','病理','診断精度']},
  {name:'TW3F-5：抗菌薬適正使用表現の統一',
    cards:[{card_id:'fever_septic_peritonitis'},{card_id:'fever_sepsis_closed-space_infection'},{card_id:'dysuria_urinary_tract_infection'},{card_id:'pupd_pyelonephritis'}],
    any1:['培養','感受性'],
    any2:['狭域化','de-escalation','培養結果','無症候性']},
  {name:'TW3F-6：電解質補正・モニタリング表現の統一',
    cards:[{card_id:'pupd_electrolyte_disorders'},{card_id:'vomit_diabetic_ketoacidosis'},{card_id:'dysuria_urethral_obstruction'}],
    any1:['K','カリウム','電解質'],
    any2:['心電図','再検','モニタ']},
];

// Phase 3g: 文献・ガイドライン照合後の高リスク治療項目を確認する静的テスト（診断候補の発火テストではない）
const LITERATURE_DOSE_AUDIT_3G_CASES = [
  {name:'LG3G-1：エピネフリン/アナフィラキシー（エピネフリン＋IM/投与経路＋気道/呼吸/循環）',
    card_id:'collapse_anaphylaxis',
    any1:['エピネフリン'],
    any2:['IM','投与経路'],
    any3:['気道','呼吸','循環']},
  {name:'LG3G-2：エチレングリコール中毒（4-メチルピラゾール/エタノール＋早期/投与タイミング＋腎/AKI）',
    card_id:'vomit_ethylene_glycol_toxicosis',
    any1:['4-メチルピラゾール','エタノール'],
    any2:['早期','投与タイミング'],
    any3:['腎','AKI']},
  {name:'LG3G-3：アセトアミノフェン中毒（N-アセチルシステイン/NAC＋メトヘモグロビン/肝＋酸素/モニタ）',
    card_id:'jaundice_acetaminophen_toxicosis',
    any1:['N-アセチルシステイン','NAC'],
    any2:['メトヘモグロビン','肝'],
    any3:['酸素','モニタ']},
  {name:'LG3G-4：抗凝固性殺鼠剤中毒（ビタミンK＋PT/凝固＋再検/モニタ）',
    card_id:'bleeding_anticoagulant_rodenticide_toxicosis',
    any1:['ビタミンK'],
    any2:['PT','凝固'],
    any3:['再検','モニタ']},
  {name:'LG3G-5：DKA（インスリン＋K/カリウム＋輸液＋再検/モニタ）',
    card_id:'vomit_diabetic_ketoacidosis',
    any1:['インスリン'],
    any2:['K','カリウム'],
    any3:['輸液'],
    any4:['再検','モニタ']},
  {name:'LG3G-6：電解質異常（Na/ナトリウム/Ca/カルシウム＋急速補正/補正速度＋心電図/再検）',
    card_id:'pupd_electrolyte_disorders',
    any1:['Na','ナトリウム','Ca','カルシウム'],
    any2:['急速補正','補正速度'],
    any3:['心電図','再検']},
  {name:'LG3G-7：猫ATE（鎮痛/オピオイド＋クロピドグレル/抗血栓＋専門/モニタ）',
    card_id:'collapse_feline_aortic_thromboembolism',
    any1:['鎮痛','オピオイド'],
    any2:['クロピドグレル','抗血栓'],
    any3:['専門','モニタ']},
  {name:'LG3G-8：抗菌薬投与期間/培養（培養/感受性＋期間/再評価/培養結果＋de-escalation/狭域化/調整）',
    cards:['fever_septic_peritonitis','pupd_pyelonephritis','jaundice_cholangitis_cat'],
    any1:['培養','感受性'],
    any2:['期間','再評価','培養結果'],
    any3:['de-escalation','狭域化','調整']},
  {name:'LG3G-9：NSAIDs/ステロイド併用注意（NSAIDs＋ステロイド＋併用/原則避ける）',
    cards:['lameness_soft_tissue_trauma','vomit_gastritis_gastric_ulcer'],
    any1:['NSAIDs'],
    any2:['ステロイド'],
    any3:['併用','原則避ける']},
  {name:'LG3G-10：化学療法/免疫抑制薬（専門/腫瘍科/成書＋診断/病理/細胞診）',
    cards:['sb_diarrhea_alimentary_lymphoma','pruritus_epitheliotropic_lymphoma','mass_mast_cell_tumor'],
    any1:['専門','腫瘍科','成書'],
    any2:['診断','病理','細胞診']},
];

// Phase 4: 全体最終安全監査・freeze判定を確認する静的テスト（診断候補の発火テストではない）
const FINAL_FREEZE_4_CASES = [
  {name:'FZ4-1：Phase 3g用量追加確認（エピネフリン/4-メチルピラゾール/NACの記載維持、投与経路/タイミング/モニタリング併記）',
    cards:['collapse_anaphylaxis','vomit_ethylene_glycol_toxicosis','jaundice_acetaminophen_toxicosis'],
    any1:['エピネフリン','4-メチルピラゾール','N-アセチルシステイン'],
    any2:['IM','IV','時間'],
    any3:['モニタ']},
  {name:'FZ4-2：保留項目確認（補正速度/ビタミンK用量差/抗血清について保留・専門判断・成書確認の表現）',
    cards:['pupd_electrolyte_disorders','bleeding_anticoagulant_rodenticide_toxicosis','collapse_envenomation_bee_snake'],
    any1:['Phase 3g','成書','院内プロトコル','専門']},
  {name:'FZ4-3：危険併用注意確認（NSAIDs＋ステロイド併用回避の維持）',
    cards:['vomit_gastritis_gastric_ulcer','lameness_soft_tissue_trauma'],
    any1:['NSAIDs'],
    any2:['ステロイド'],
    any3:['併用','原則避ける']},
  {name:'FZ4-4：感染除外前ステロイド確認（維持確認）',
    cards:['sb_diarrhea_chronic_enteropathy_ple','lameness_immune-mediated_polyarthritis','jaundice_cholangitis_cat'],
    any1:['ステロイド'],
    any2:['感染','感染性'],
    any3:['除外','確認']},
];
















const SUPPORT_SEPARATION_CASES = [
  {name:'支持所見分離：乳び性胸水のみ→膿胸は未評価', check:['fluid_chylous'], targetCand:'膿胸', expectUnevaluated:true},
  {name:'支持所見分離：好中球優位胸水→膿胸は支持あり', check:['fluid_high_tncc_neutrophilic'], targetCand:'膿胸', expectUnevaluated:false},
  {name:'支持所見分離：細胞内細菌→化膿性腹膜炎は支持あり', check:['fluid_intracellular_bacteria'], targetCand:'化膿性腹膜炎', expectUnevaluated:false},
  {name:'支持所見分離：血性胸水のみ→膿胸は未評価', check:['fluid_hemorrhagic'], targetCand:'膿胸', expectUnevaluated:true},
  {name:'支持所見分離：血性胸水のみ→心タンポナーデ等は支持あり', check:['fluid_hemorrhagic'], targetCand:'心タンポナーデ・腹腔内出血（脾腫瘤破裂）', expectUnevaluated:false},
];

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
setTimeout(async ()=>{
  const doc = dom.window.document;
  const win = dom.window;
  doc.getElementById('plToggle').click();

  let pass=0, fail=0;
  CASES.forEach(tc=>{
    // リセット
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  ✗ Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input');
      cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-name')].map(el=>el.textContent);

    const dpOk = tc.expectDP.every(e=>dpLabels.includes(e));
    const candOk = tc.expectCand.every(e=>candLabels.includes(e));
    const ok = dpOk && candOk;
    if(ok) pass++; else fail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){
      console.log('   期待DP:', tc.expectDP, '実際:', dpLabels);
      console.log('   期待候補:', tc.expectCand, '実際:', candLabels);
    }
  });
  console.log('\n結果: '+pass+' PASS / '+fail+' FAIL （計'+CASES.length+'件）');

  // 支持所見分離の追加検証
  let sepPass=0, sepFail=0;
  SUPPORT_SEPARATION_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const cards = [...doc.querySelectorAll('.cand-card')];
    const target = cards.find(c=>c.querySelector('.cand-name').textContent===tc.targetCand);
    const supportRow = target ? target.querySelector('.cand-row.support') : null;
    const isUnevaluated = supportRow && supportRow.textContent.includes('未評価です');
    const ok = target && (isUnevaluated===tc.expectUnevaluated);
    if(ok) sepPass++; else sepFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
  });
  console.log('支持所見分離テスト: '+sepPass+' PASS / '+sepFail+' FAIL');

  // 猫黄疸クラスターの追加検証
  let felPass=0, felFail=0;
  FELINE_JAUNDICE_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candCards = [...doc.querySelectorAll('.cand-card')];
    const candLabels = candCards.map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));

    if(tc.expectPrimary){
      // 整合する候補と診断分岐グループの先頭（primary）にあるかを、グループ内での並び順で判定
      const group = [...doc.querySelectorAll('.cand-group')].find(g=>g.querySelector('.cand-group-h').textContent.includes('整合する候補'));
      const namesInGroup = group ? [...group.querySelectorAll('.cand-name')].map(e=>e.textContent) : [];
      ok = ok && namesInGroup[0] === tc.expectPrimary;
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) felPass++; else felFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('猫黄疸クラスターテスト: '+felPass+' PASS / '+felFail+' FAIL');

  // 嘔吐・食欲不振クラスターの追加検証
  let vomPass=0, vomFail=0;
  VOMIT_ANOREXIA_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) vomPass++; else vomFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('嘔吐・食欲不振クラスターテスト: '+vomPass+' PASS / '+vomFail+' FAIL');

  // 腎泌尿器クラスターの追加検証
  let uriPass=0, uriFail=0;
  URINARY_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) uriPass++; else uriFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('腎泌尿器クラスターテスト: '+uriPass+' PASS / '+uriFail+' FAIL');

  // 呼吸器・咳クラスターの追加検証
  let respPass=0, respFail=0;
  RESPIRATORY_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectGuidance) ok = ok && !!doc.querySelector('.dp-guidance');
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) respPass++; else respFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('呼吸器・咳クラスターテスト: '+respPass+' PASS / '+respFail+' FAIL');

  // 神経・血液・体腔液クラスターの追加検証
  let nbfPass=0, nbfFail=0;
  NEURO_BLOOD_FLUID_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) nbfPass++; else nbfFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('神経・血液・体腔液クラスターテスト: '+nbfPass+' PASS / '+nbfFail+' FAIL');

  // 内分泌・代謝クラスターの追加検証
  let endoPass=0, endoFail=0;
  ENDOCRINE_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) endoPass++; else endoFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('内分泌・代謝クラスターテスト: '+endoPass+' PASS / '+endoFail+' FAIL');

  // 皮膚・腫瘤・眼科クラスターの追加検証
  let demPass=0, demFail=0;
  DERM_MASS_EYE_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) demPass++; else demFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('皮膚・腫瘤・眼科クラスターテスト: '+demPass+' PASS / '+demFail+' FAIL');

  // 整形外科・外傷・眼窩クラスターの追加検証（5.49-5.50）
  let orthoPass=0, orthoFail=0;
  ORTHO_TRAUMA_EYE_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) orthoPass++; else orthoFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('整形外科・外傷・眼窩クラスターテスト: '+orthoPass+' PASS / '+orthoFail+' FAIL');

  // 5.50aチェックポイントA修正確認テスト
  let fixPass=0, fixFail=0;
  CHECKPOINT_A_FIX_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) fixPass++; else fixFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('5.50aチェックポイントA修正確認テスト: '+fixPass+' PASS / '+fixFail+' FAIL');

  // 5.51生殖器・産科・泌尿生殖器クラスターテスト
  let reproPass=0, reproFail=0;
  REPRO_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) reproPass++; else reproFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('5.51生殖器・産科・泌尿生殖器クラスターテスト: '+reproPass+' PASS / '+reproFail+' FAIL');

  // 5.51a生殖器クラスター過剰発火修正確認テスト
  let reproFixPass=0, reproFixFail=0;
  REPRO_FIX_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) reproFixPass++; else reproFixFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('5.51a生殖器クラスター過剰発火修正確認テスト: '+reproFixPass+' PASS / '+reproFixFail+' FAIL');

  // 5.52口腔・歯科・鼻腔・耳・咽喉頭ENTクラスターテスト
  let entPass=0, entFail=0;
  ENT_552_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }

    if(ok) entPass++; else entFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('5.52口腔・歯科・鼻腔・耳・咽喉頭ENTクラスターテスト: '+entPass+' PASS / '+entFail+' FAIL');

  // 5.52a 過剰発火修正確認テスト
  let ent2Pass=0, ent2Fail=0;
  ENT_552A_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }
    if(tc.notCriticalMimic){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notCriticalMimic);
      ok = ok && (!card || card.dataset.role!=='critical_mimic');
    }

    if(ok) ent2Pass++; else ent2Fail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels, ' roles:', [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent+':'+c.dataset.role)); }
  });
  console.log('5.52a過剰発火修正確認テスト: '+ent2Pass+' PASS / '+ent2Fail+' FAIL');

  // 5.53 中毒・環境・急性救急クラスターテスト
  let toxPass=0, toxFail=0;
  TOX_553_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }
    if(tc.notCriticalMimic){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notCriticalMimic);
      ok = ok && (!card || card.dataset.role!=='critical_mimic');
    }

    if(ok) toxPass++; else toxFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels, ' roles:', [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent+':'+c.dataset.role)); }
  });
  console.log('5.53中毒・環境・急性救急クラスターテスト: '+toxPass+' PASS / '+toxFail+' FAIL');

  // 5.53a 中毒・環境救急DP過剰発火修正確認テスト
  let toxAPass=0, toxAFail=0;
  TOX_553A_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candLabels = [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }
    if(tc.notCriticalMimic){
      const card = [...doc.querySelectorAll('.cand-card')].find(c=>c.querySelector('.cand-name').textContent===tc.notCriticalMimic);
      ok = ok && (!card || card.dataset.role!=='critical_mimic');
    }

    if(ok) toxAPass++; else toxAFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels, ' roles:', [...doc.querySelectorAll('.cand-card')].map(c=>c.querySelector('.cand-name').textContent+':'+c.dataset.role)); }
  });
  console.log('5.53a中毒・環境救急DP過剰発火修正確認テスト: '+toxAPass+' PASS / '+toxAFail+' FAIL');

  // 5.53b 中毒候補の横滑り・role過剰表示修正確認テスト
  let toxBPass=0, toxBFail=0;
  TOX_553B_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candCards = [...doc.querySelectorAll('.cand-card')];
    const candLabels = candCards.map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }
    if(tc.notCriticalMimic){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notCriticalMimic);
      ok = ok && (!card || card.dataset.role!=='critical_mimic');
    }
    if(tc.notBranch){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notBranch);
      ok = ok && (!card || card.dataset.role!=='branch');
    }
    if(tc.notRoleAny){
      tc.notRoleAny.forEach(nr=>{
        const card = candCards.find(c=>c.querySelector('.cand-name').textContent===nr.name);
        ok = ok && (!card || card.dataset.role!==nr.role);
      });
    }

    if(ok) toxBPass++; else toxBFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels, ' roles:', candCards.map(c=>c.querySelector('.cand-name').textContent+':'+c.dataset.role)); }
  });
  console.log('5.53b中毒候補role整理確認テスト: '+toxBPass+' PASS / '+toxBFail+' FAIL');

  // 5.54 診断ロジック全体監査 保護テスト
  let auditPass=0, auditFail=0;
  AUDIT_554_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candCards = [...doc.querySelectorAll('.cand-card')];
    const candLabels = candCards.map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }
    if(tc.notCriticalMimic){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notCriticalMimic);
      ok = ok && (!card || card.dataset.role!=='critical_mimic');
    }
    if(tc.notBranch){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notBranch);
      ok = ok && (!card || card.dataset.role!=='branch');
    }
    if(tc.notRoleAny){
      tc.notRoleAny.forEach(nr=>{
        const card = candCards.find(c=>c.querySelector('.cand-name').textContent===nr.name);
        ok = ok && (!card || card.dataset.role!==nr.role);
      });
    }
    if(tc.expectRoleAny){
      ok = ok && tc.expectRoleAny.some(er=>{
        const card = candCards.find(c=>c.querySelector('.cand-name').textContent===er.name);
        return !!card && card.dataset.role===er.role;
      });
    }

    if(ok) auditPass++; else auditFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels, ' roles:', candCards.map(c=>c.querySelector('.cand-name').textContent+':'+c.dataset.role)); }
  });
  console.log('5.54診断ロジック全体監査保護テスト: '+auditPass+' PASS / '+auditFail+' FAIL');

  // 5.54a 局所感染・尿道閉塞role修正確認テスト
  let audit2Pass=0, audit2Fail=0;
  AUDIT_554A_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candCards = [...doc.querySelectorAll('.cand-card')];
    const candLabels = candCards.map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }
    if(tc.notCriticalMimic){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notCriticalMimic);
      ok = ok && (!card || card.dataset.role!=='critical_mimic');
    }
    if(tc.notBranch){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notBranch);
      ok = ok && (!card || card.dataset.role!=='branch');
    }
    if(tc.notRoleAny){
      tc.notRoleAny.forEach(nr=>{
        const card = candCards.find(c=>c.querySelector('.cand-name').textContent===nr.name);
        ok = ok && (!card || card.dataset.role!==nr.role);
      });
    }
    if(tc.expectRoleAny){
      ok = ok && tc.expectRoleAny.some(er=>{
        const card = candCards.find(c=>c.querySelector('.cand-name').textContent===er.name);
        return !!card && card.dataset.role===er.role;
      });
    }

    if(ok) audit2Pass++; else audit2Fail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels, ' roles:', candCards.map(c=>c.querySelector('.cand-name').textContent+':'+c.dataset.role)); }
  });
  console.log('5.54a局所感染・尿道閉塞role修正確認テスト: '+audit2Pass+' PASS / '+audit2Fail+' FAIL');

  // 5.55 代表症例レッドチームテスト
  let rtPass=0, rtFail=0;
  REDTEAM_555_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candCards = [...doc.querySelectorAll('.cand-card')];
    const candLabels = candCards.map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.notDP) ok = ok && !dpLabels.includes(tc.notDP);
    if(tc.expectCandAny) ok = ok && tc.expectCandAny.some(e=>candLabels.includes(e));
    if(tc.expectPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }
    if(tc.notPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notPrimary);
      ok = ok && (!card || card.dataset.role!=='primary');
    }
    if(tc.notCriticalMimic){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notCriticalMimic);
      ok = ok && (!card || card.dataset.role!=='critical_mimic');
    }
    if(tc.notBranch){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.notBranch);
      ok = ok && (!card || card.dataset.role!=='branch');
    }
    if(tc.notRoleAny){
      tc.notRoleAny.forEach(nr=>{
        const card = candCards.find(c=>c.querySelector('.cand-name').textContent===nr.name);
        ok = ok && (!card || card.dataset.role!==nr.role);
      });
    }
    if(tc.expectRoleAny){
      ok = ok && tc.expectRoleAny.some(er=>{
        const card = candCards.find(c=>c.querySelector('.cand-name').textContent===er.name);
        return !!card && card.dataset.role===er.role;
      });
    }

    if(ok) rtPass++; else rtFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels, ' roles:', candCards.map(c=>c.querySelector('.cand-name').textContent+':'+c.dataset.role)); }
  });
  console.log('5.55代表症例レッドチームテスト: '+rtPass+' PASS / '+rtFail+' FAIL');

  // Phase2 診断ロジック整理・文言整理 保護テスト
  let p2Pass=0, p2Fail=0;
  PHASE2_CASES.forEach(tc=>{
    doc.getElementById('plReset').click();
    tc.check.forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input'); cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });
    const dpLabels = [...doc.querySelectorAll('.dp-label')].map(el=>el.textContent);
    const candCards = [...doc.querySelectorAll('.cand-card')];
    const candLabels = candCards.map(c=>c.querySelector('.cand-name').textContent);

    let ok = (tc.expectDP||[]).every(e=>dpLabels.includes(e));
    if(tc.expectPrimary){
      const card = candCards.find(c=>c.querySelector('.cand-name').textContent===tc.expectPrimary);
      ok = ok && !!card && card.dataset.role==='primary';
    }

    if(ok) p2Pass++; else p2Fail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   DP:', dpLabels, ' 候補:', candLabels); }
  });
  console.log('Phase2診断ロジック整理保護テスト: '+p2Pass+' PASS / '+p2Fail+' FAIL');

  // Phase 3b: 治療欄の静的安全性検査（診断エンジンを介さず、htmlソース文字列を直接検査）
  let ts3bPass=0, ts3bFail=0;
  TREATMENT_SAFETY_3B_CASES.forEach(tc=>{
    const marker = '"card_id": "'+tc.card_id+'"';
    const idx = html.indexOf(marker);
    if(idx === -1){
      ts3bFail++;
      console.log('✗ FAIL '+tc.name+' (card_id not found: '+tc.card_id+')');
      return;
    }
    const windowStart = Math.max(0, idx - 3000);
    const segment = html.slice(windowStart, idx + marker.length);
    const hasAny = (arr) => arr.some(kw => segment.includes(kw));
    let ok = true;
    if(tc.any1) ok = ok && hasAny(tc.any1);
    if(tc.any2) ok = ok && hasAny(tc.any2);
    if(tc.any3) ok = ok && hasAny(tc.any3);

    if(ok) ts3bPass++; else ts3bFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   any1:', tc.any1, ' any2:', tc.any2, ' any3:', tc.any3); }
  });
  console.log('Phase3b治療安全化静的テスト: '+ts3bPass+' PASS / '+ts3bFail+' FAIL');

  // Phase 3c: 抗菌薬適正使用の静的検査（診断エンジンを介さず、htmlソース文字列を直接検査）
  let as3cPass=0, as3cFail=0;
  ANTIMICROBIAL_STEWARDSHIP_3C_CASES.forEach(tc=>{
    const marker = '"card_id": "'+tc.card_id+'"';
    const idx = html.indexOf(marker);
    if(idx === -1){
      as3cFail++;
      console.log('✗ FAIL '+tc.name+' (card_id not found: '+tc.card_id+')');
      return;
    }
    const windowStart = Math.max(0, idx - 3000);
    const windowEnd = Math.min(html.length, idx + marker.length + 3000);
    const segment = html.slice(windowStart, windowEnd);
    const hasAny = (arr) => arr.some(kw => segment.includes(kw));
    let ok = true;
    if(tc.any1) ok = ok && hasAny(tc.any1);
    if(tc.any2) ok = ok && hasAny(tc.any2);
    if(tc.any3) ok = ok && hasAny(tc.any3);

    if(ok) as3cPass++; else as3cFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   any1:', tc.any1, ' any2:', tc.any2, ' any3:', tc.any3); }
  });
  console.log('Phase3c抗菌薬適正使用静的テスト: '+as3cPass+' PASS / '+as3cFail+' FAIL');

  // Phase 3d: NSAIDs/ステロイド/鎮痛薬の静的検査（診断エンジンを介さず、htmlソース文字列を直接検査）
  let ns3dPass=0, ns3dFail=0;
  NSAID_STEROID_ANALGESIC_3D_CASES.forEach(tc=>{
    const marker = '"card_id": "'+tc.card_id+'"';
    const idx = html.indexOf(marker);
    if(idx === -1){
      ns3dFail++;
      console.log('✗ FAIL '+tc.name+' (card_id not found: '+tc.card_id+')');
      return;
    }
    const windowStart = Math.max(0, idx - 3000);
    const windowEnd = Math.min(html.length, idx + marker.length + 3000);
    const segment = html.slice(windowStart, windowEnd);
    const hasAny = (arr) => arr.some(kw => segment.includes(kw));
    let ok = true;
    if(tc.any1) ok = ok && hasAny(tc.any1);
    if(tc.any2) ok = ok && hasAny(tc.any2);
    if(tc.any3) ok = ok && hasAny(tc.any3);

    if(ok) ns3dPass++; else ns3dFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   any1:', tc.any1, ' any2:', tc.any2, ' any3:', tc.any3); }
  });
  console.log('Phase3d NSAIDs/ステロイド/鎮痛薬安全化静的テスト: '+ns3dPass+' PASS / '+ns3dFail+' FAIL');

  // Phase 3e: 内分泌・電解質・中毒薬剤用量の静的検査（診断エンジンを介さず、htmlソース文字列を直接検査）
  let et3ePass=0, et3eFail=0;
  ENDO_ELECTROLYTE_TOXIN_3E_CASES.forEach(tc=>{
    const marker = '"card_id": "'+tc.card_id+'"';
    const idx = html.indexOf(marker);
    if(idx === -1){
      et3eFail++;
      console.log('✗ FAIL '+tc.name+' (card_id not found: '+tc.card_id+')');
      return;
    }
    const windowStart = Math.max(0, idx - 3000);
    const windowEnd = Math.min(html.length, idx + marker.length + 3000);
    const segment = html.slice(windowStart, windowEnd);
    const hasAny = (arr) => arr.some(kw => segment.includes(kw));
    let ok = true;
    if(tc.any1) ok = ok && hasAny(tc.any1);
    if(tc.any2) ok = ok && hasAny(tc.any2);
    if(tc.any3) ok = ok && hasAny(tc.any3);
    if(tc.any4) ok = ok && hasAny(tc.any4);

    if(ok) et3ePass++; else et3eFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!ok){ console.log('   any1:', tc.any1, ' any2:', tc.any2, ' any3:', tc.any3, ' any4:', tc.any4); }
  });
  console.log('Phase3e内分泌・電解質・中毒薬剤安全化静的テスト: '+et3ePass+' PASS / '+et3eFail+' FAIL');

  // Phase 3f: 治療欄文言統一の静的検査（診断エンジンを介さず、htmlソース文字列を直接検査。複数card_idを横断確認）
  let tw3fPass=0, tw3fFail=0;
  TREATMENT_WORDING_3F_CASES.forEach(tc=>{
    let allOk = true;
    const details = [];
    tc.cards.forEach(cardSpec=>{
      const cid = cardSpec.card_id;
      const marker = '"card_id": "'+cid+'"';
      const idx = html.indexOf(marker);
      if(idx === -1){
        allOk = false;
        details.push(cid+': card_id not found');
        return;
      }
      const windowStart = Math.max(0, idx - 3000);
      const windowEnd = Math.min(html.length, idx + marker.length + 3000);
      const segment = html.slice(windowStart, windowEnd);
      const hasAny = (arr) => arr.some(kw => segment.includes(kw));
      let ok = true;
      if(tc.any1) ok = ok && hasAny(tc.any1);
      if(tc.any2) ok = ok && hasAny(tc.any2);
      if(tc.any3) ok = ok && hasAny(tc.any3);
      if(tc.toxinAny && cardSpec.isToxin) ok = ok && hasAny(tc.toxinAny);
      if(!ok) details.push(cid+': FAIL');
      allOk = allOk && ok;
    });

    if(allOk) tw3fPass++; else tw3fFail++;
    console.log((allOk?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!allOk){ console.log('   details:', details); }
  });
  console.log('Phase3f治療欄文言統一静的テスト: '+tw3fPass+' PASS / '+tw3fFail+' FAIL');

  // Phase 3g: 文献照合後の高リスク治療項目の静的検査（診断エンジンを介さず、htmlソース文字列を直接検査）
  let lg3gPass=0, lg3gFail=0;
  LITERATURE_DOSE_AUDIT_3G_CASES.forEach(tc=>{
    const cardIds = tc.cards ? tc.cards : [tc.card_id];
    let allOk = true;
    const details = [];
    cardIds.forEach(cid=>{
      const marker = '"card_id": "'+cid+'"';
      const idx = html.indexOf(marker);
      if(idx === -1){
        allOk = false;
        details.push(cid+': card_id not found');
        return;
      }
      const windowStart = Math.max(0, idx - 3000);
      const windowEnd = Math.min(html.length, idx + marker.length + 3000);
      const segment = html.slice(windowStart, windowEnd);
      const hasAny = (arr) => arr.some(kw => segment.includes(kw));
      let ok = true;
      if(tc.any1) ok = ok && hasAny(tc.any1);
      if(tc.any2) ok = ok && hasAny(tc.any2);
      if(tc.any3) ok = ok && hasAny(tc.any3);
      if(tc.any4) ok = ok && hasAny(tc.any4);
      if(!ok) details.push(cid+': FAIL');
      allOk = allOk && ok;
    });

    if(allOk) lg3gPass++; else lg3gFail++;
    console.log((allOk?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!allOk){ console.log('   details:', details); }
  });
  console.log('Phase3g文献・ガイドライン照合静的テスト: '+lg3gPass+' PASS / '+lg3gFail+' FAIL');

  // Phase 4: 全体最終安全監査・freeze判定の静的検査（診断エンジンを介さず、htmlソース文字列を直接検査。各対象カードを個別に確認）
  let fz4Pass=0, fz4Fail=0;
  FINAL_FREEZE_4_CASES.forEach(tc=>{
    const cardIds = tc.cards ? tc.cards : [tc.card_id];
    let allOk = true;
    const details = [];
    cardIds.forEach(cid=>{
      const marker = '"card_id": "'+cid+'"';
      const idx = html.indexOf(marker);
      if(idx === -1){
        allOk = false;
        details.push(cid+': card_id not found');
        return;
      }
      const windowStart = Math.max(0, idx - 3000);
      const windowEnd = Math.min(html.length, idx + marker.length + 3000);
      const segment = html.slice(windowStart, windowEnd);
      const hasAny = (arr) => arr.some(kw => segment.includes(kw));
      let ok = true;
      if(tc.any1) ok = ok && hasAny(tc.any1);
      if(tc.any2) ok = ok && hasAny(tc.any2);
      if(tc.any3) ok = ok && hasAny(tc.any3);
      if(!ok) details.push(cid+': FAIL');
      allOk = allOk && ok;
    });

    if(allOk) fz4Pass++; else fz4Fail++;
    console.log((allOk?'✓ PASS':'✗ FAIL')+' '+tc.name);
    if(!allOk){ console.log('   details:', details); }
  });
  console.log('Phase4全体最終安全監査静的テスト: '+fz4Pass+' PASS / '+fz4Fail+' FAIL');

  // ==========================================================================
  // Phase 5b2：入口所見＋条件付き深掘り表示のUI/DOM静的テスト
  // ==========================================================================
  let crPass=0, crFail=0;
  function crCheck(name, ok, detail){
    if(ok) crPass++; else crFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function crSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }
  function crIsVisibleInCtx(entryId, id){
    const group = doc.querySelector('.ctx-group[data-entry="'+entryId+'"]');
    if(!group) return false;
    if(group.style.display !== 'block') return false;
    const chip = group.querySelector('.pl-chip[data-fid="'+id+'"]');
    return !!chip;
  }

  (function(){
    doc.getElementById('plReset').click();

    // CR5B2-1：初期表示が絞られている
    // ※ENTRY_RAW_IDSの実体は「まず選ぶ入口所見（.raw-entry-section）」→Phase 5b4で「よく使う」タブの実体チップ
    //   （#tabCommonChips）→Phase 5dで「Step1：来院時に選ぶ」（.raw-step-section[data-step="1"]）に移設された。
    //   検証対象の要素は変わるが、「入口所見相当の件数が30〜50件の範囲内である」という検証意図自体は変更していない。
    const entryChips = doc.querySelectorAll('.raw-step-section[data-step="1"] .pl-chip');
    const entryCount = entryChips.length;
    crCheck('CR5B2-1a：入口所見数が30〜50件の範囲内', entryCount>=30 && entryCount<=50, 'entryCount='+entryCount);

    const oldLevel1Style = doc.querySelector('.raw-level[data-level="1"]');
    crCheck('CR5B2-1b：旧Level1（症状・病歴239件を無条件表示する構造）が存在しない', !oldLevel1Style, 'raw-level[data-level="1"]が残存');

    const allChips = doc.querySelectorAll('.pl-chip');
    const allIds = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    crCheck('CR5B2-1c：pl-chip総数が504件', allChips.length===504, 'count='+allChips.length);
    crCheck('CR5B2-1d：data-fidユニーク数が504件（参照切れ・重複なし）', allIds.size===504, 'unique='+allIds.size);

    const ctxEmptyDefault = doc.getElementById('ctxEmpty');
    crCheck('CR5B2-1e：初期状態で「関連する追加所見」が空表示メッセージを示す', ctxEmptyDefault && ctxEmptyDefault.style.display!=='none');

    // CR5B2-2：下痢（f06）選択で深掘り所見が表示される
    crSetChecked('f06', true);
    const f06Ids = ['pe_tenesmus','hx_weightloss','chem_alb_low','us_gi_wall_thick','hx_multi_animal_household','spec_cobalamin_low'];
    const f06Ok = f06Ids.every(id=>crIsVisibleInCtx('f06', id));
    crCheck('CR5B2-2：下痢（f06）選択でしぶり/渋り・体重減少・低Alb等の追加所見が表示される', f06Ok, f06Ids.filter(id=>!crIsVisibleInCtx('f06',id)));
    crSetChecked('f06', false);

    // CR5B2-3：嘔吐（f05）選択で深掘り所見が表示される
    crSetChecked('f05', true);
    const f05Ids = ['hx_foreign_body_ingestion','pe_abdominal_pain','rad_si_dilation','spec_cpl_fpl_high','chem_bun_high','chem_crea_high','ua_ketonuria','abg_met_acidosis'];
    const f05Ok = f05Ids.every(id=>crIsVisibleInCtx('f05', id));
    crCheck('CR5B2-3：嘔吐（f05）選択で異物誤食歴・腹痛・腸管拡張・膵炎マーカー等の追加所見が表示される', f05Ok, f05Ids.filter(id=>!crIsVisibleInCtx('f05',id)));
    crSetChecked('f05', false);

    // CR5B2-4：排尿困難（ua_stranguria）選択で閉塞関連所見が表示される
    crSetChecked('ua_stranguria', true);
    const dysuriaIds = ['pe_large_bladder','elec_k_high','ecg_bradycardia_hyperkalemia','ua_crystal_struvite','us_bladder_urolith','us_renal_pelvis_dilation'];
    const dysuriaOk = dysuriaIds.every(id=>crIsVisibleInCtx('ua_stranguria', id));
    crCheck('CR5B2-4：排尿困難（しぶり／排尿困難）選択で膀胱拡張・高K・徐脈/不整脈・尿石関連所見が表示される', dysuriaOk, dysuriaIds.filter(id=>!crIsVisibleInCtx('ua_stranguria',id)));
    crSetChecked('ua_stranguria', false);

    // CR5B2-5：中毒/誤食（hx_toxin_exposure_known）選択で曝露歴が表示される
    crSetChecked('hx_toxin_exposure_known', true);
    const toxIds = ['hx_nsaid_ingestion','hx_grape_raisin_ingestion','hx_ethylene_glycol_ingestion','hx_acetaminophen_ingestion','hx_allium_ingestion','hx_chocolate_caffeine_ingestion','hx_xylitol_ingestion','hx_rodenticide_exposure'];
    const toxOk = toxIds.every(id=>crIsVisibleInCtx('hx_toxin_exposure_known', id));
    crCheck('CR5B2-5：中毒/誤食選択でNSAIDs・ブドウ/EG/APAP/ネギ類/チョコ/キシリトール/殺鼠剤の曝露歴が表示される', toxOk, toxIds.filter(id=>!crIsVisibleInCtx('hx_toxin_exposure_known',id)));
    crSetChecked('hx_toxin_exposure_known', false);

    // CR5B2-B1〜B4：呼吸困難・発作・皮膚のかゆみ・腫瘤（要件書「主な動作例」の追加確認）
    crSetChecked('f13', true);
    const f13Ids = ['pe_muffled_lung_sound','rad_pleural_effusion','rad_pneumothorax','rad_alveolar','echo_la_enlargement','pe_wheeze'];
    crCheck('CR5B2-B1：呼吸困難（f13）選択で肺音減弱・胸水・気胸・肺胞パターン・左房拡大等が表示される', f13Ids.every(id=>crIsVisibleInCtx('f13',id)));
    crSetChecked('f13', false);

    crSetChecked('f14', true);
    const f14Ids = ['pe_mentation_altered','pe_neuro_deficit_lateralizing','chem_glucose_low','elec_ca_low','chem_ammonia_high','hx_status_epilepticus'];
    crCheck('CR5B2-B2：発作（f14）選択で意識変化・神経学的欠損・低血糖・低Ca・高アンモニア・発作重積が表示される', f14Ids.every(id=>crIsVisibleInCtx('f14',id)));
    crSetChecked('f14', false);

    crSetChecked('f18', true);
    const f18Ids = ['pe_ear_pruritus','pe_paw_licking','pe_flea_dirt','pe_lumbosacral_pruritus','cyto_skin_cocci','cyto_skin_yeast','pe_circular_alopecia'];
    crCheck('CR5B2-B3：皮膚のかゆみ（f18）選択で耳痒み・肢端舐め・ノミ糞・膿皮症/マラセチア細胞診等が表示される', f18Ids.every(id=>crIsVisibleInCtx('f18',id)));
    crSetChecked('f18', false);

    crSetChecked('f24', true);
    const f24Ids = ['pe_cutaneous_mass','pe_mass_rapid_growth','pe_mass_ulcerated','elec_ica_high','pe_anal_sac_mass','pe_mammary_mass','cyto_mast_cells','cyto_round_cell_neoplasia'];
    crCheck('CR5B2-B4：腫瘤（f24）選択で急速増大・潰瘍・高Ca・肛門嚢腫瘤・乳腺腫瘤・肥満細胞/円形細胞細胞診が表示される', f24Ids.every(id=>crIsVisibleInCtx('f24',id)));
    crSetChecked('f24', false);

    // 入口所見を外しても内部的な選択状態（checked）は保持されるか
    crSetChecked('f06', true);
    crSetChecked('chem_alb_low', true);
    crSetChecked('f06', false);
    const albInput = doc.querySelector('.pl-chip[data-fid="chem_alb_low"]').querySelector('input');
    crCheck('CR5B2-7：入口所見を外しても関連追加所見のチェック状態は保持される', albInput.checked===true);
    crSetChecked('chem_alb_low', false);

    doc.getElementById('plReset').click();
  })();

  console.log('Phase5b2 入口所見＋条件付き深掘り表示テスト: '+crPass+' PASS / '+crFail+' FAIL');

  // ==========================================================================
  // Phase 5b3：選択中所見の常時表示・直接検索・所見カテゴリタブのUI/DOM静的テスト
  // ==========================================================================
  let srPass=0, srFail=0;
  function srCheck(name, ok, detail){
    if(ok) srPass++; else srFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function srSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }

  (function(){
    doc.getElementById('plReset').click();

    // SR5B3-1：チェック済み追加所見が選択中エリアに残る
    srSetChecked('f01', true);
    srSetChecked('cbc_neutrophilia', true);
    srSetChecked('f01', false);
    const nInput = doc.querySelector('.pl-chip[data-fid="cbc_neutrophilia"]').querySelector('input');
    const selectedText1 = doc.getElementById('selectedRawArea').textContent;
    const checkedSetNow = new Set([...doc.querySelectorAll('input[type=checkbox]:checked')].map(el=>el.value));
    srCheck('SR5B3-1：f01解除後もcbc_neutrophilia（好中球増多）のチェックが維持される', nInput.checked===true);
    srCheck('SR5B3-1：「選択中の所見」に好中球増多が表示される', selectedText1.includes('好中球増多'));
    srCheck('SR5B3-1：診断候補計算に使う選択集合（checked）にcbc_neutrophiliaが含まれる', checkedSetNow.has('cbc_neutrophilia'));
    srSetChecked('cbc_neutrophilia', false);

    // SR5B3-2：選択中チップの×で解除できる
    srSetChecked('f06', true);
    const selXBtn = doc.querySelector('#selectedRawArea .sel-x[data-fid="f06"]');
    srCheck('SR5B3-2：選択中の所見に×ボタンが存在する', !!selXBtn);
    if(selXBtn) selXBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const f06cb = doc.querySelector('.pl-chip[data-fid="f06"]').querySelector('input');
    srCheck('SR5B3-2：×クリックでチェックが外れる', f06cb.checked===false);
    srCheck('SR5B3-2：選択中の所見エリアから消える', !doc.getElementById('selectedRawArea').textContent.includes('下痢'));

    // SR5B3-3：直接検索で所見を追加できる
    const searchInput = doc.getElementById('rawSearchInput');
    searchInput.value = '好中球';
    searchInput.dispatchEvent(new win.Event('input', {bubbles:true}));
    const searchResults = [...doc.querySelectorAll('#rawSearchResults .search-result-item')];
    const targetResult = searchResults.find(el=>el.dataset.fid==='cbc_neutrophilia');
    srCheck('SR5B3-3：検索結果に該当所見（好中球増多）が表示される', !!targetResult, searchResults.map(el=>el.dataset.fid));
    if(targetResult) targetResult.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const ncbAfterSearch = doc.querySelector('.pl-chip[data-fid="cbc_neutrophilia"]').querySelector('input');
    srCheck('SR5B3-3：検索結果クリックで該当所見がチェックされる', ncbAfterSearch && ncbAfterSearch.checked===true);
    srCheck('SR5B3-3：「選択中の所見」に表示される', doc.getElementById('selectedRawArea').textContent.includes('好中球増多'));
    const allChipsSr3 = doc.querySelectorAll('.pl-chip');
    const uniqueIdsSr3 = new Set([...allChipsSr3].map(c=>c.getAttribute('data-fid')));
    srCheck('SR5B3-3：pl-chip総数504を維持', allChipsSr3.length===504, allChipsSr3.length);
    srCheck('SR5B3-3：data-fidユニーク数504を維持', uniqueIdsSr3.size===504, uniqueIdsSr3.size);
    searchInput.value = '';
    searchInput.dispatchEvent(new win.Event('input', {bubbles:true}));
    srSetChecked('cbc_neutrophilia', false);

    // SR5B3-4：タブ切り替えで選択状態が消えない
    srSetChecked('hx_allium_ingestion', true);
    const tabButtons = [...doc.querySelectorAll('.raw-tab-btn')];
    const giTab = tabButtons.find(b=>b.textContent==='消化器');
    const commonTab = tabButtons.find(b=>b.textContent==='よく使う');
    if(giTab) giTab.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const alliumMidSwitch = doc.querySelector('.pl-chip[data-fid="hx_allium_ingestion"]').querySelector('input');
    srCheck('SR5B3-4：タブ切り替え後も選択状態（input.checked）が維持される', alliumMidSwitch.checked===true);
    if(commonTab) commonTab.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const alliumBack = doc.querySelector('.pl-chip[data-fid="hx_allium_ingestion"]').querySelector('input');
    srCheck('SR5B3-4：元のタブに戻っても選択状態が維持される', alliumBack.checked===true);
    srCheck('SR5B3-4：「選択中の所見」に残る', doc.getElementById('selectedRawArea').textContent.includes('たまねぎ'));
    srSetChecked('hx_allium_ingestion', false);

    // plResetで選択中の所見がすべて解除されることの確認
    srSetChecked('f01', true);
    srSetChecked('cbc_neutrophilia', true);
    doc.getElementById('plReset').click();
    const allCheckedAfterReset = doc.querySelectorAll('input[type=checkbox]:checked').length;
    srCheck('SR5B3-5：plResetで選択中の所見がすべて解除される', allCheckedAfterReset===0);
    // ※Phase 5gで空状態の案内文を「所見を選択してください」から、より分かりやすい文言に変更した
    //   （検証意図＝plReset後に選択中の所見エリアが空表示に戻ることは変更していない）。
    srCheck('SR5B3-5：plReset後は「選択中の所見」が空表示になる', doc.getElementById('selectedRawArea').textContent.includes('まだ所見が選択されていません'));

    // 参照切れなしの最終確認
    const finalChips = doc.querySelectorAll('.pl-chip');
    const finalUnique = new Set([...finalChips].map(c=>c.getAttribute('data-fid')));
    srCheck('SR5B3-6：全体を通してpl-chip総数504・ユニーク数504（参照切れなし）', finalChips.length===504 && finalUnique.size===504);
  })();

  console.log('Phase5b3 選択中所見・直接検索・カテゴリタブテスト: '+srPass+' PASS / '+srFail+' FAIL');

  // ==========================================================================
  // Phase 5b4：所見タブUIの重複整理（「よく使う」タブと「まず選ぶ入口所見」の二重表示解消）
  // ==========================================================================
  let rtPass4=0, rtFail4=0;
  function rtCheck(name, ok, detail){
    if(ok) rtPass4++; else rtFail4++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function rtSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }

  (function(){
    doc.getElementById('plReset').click();
    // 前の検証ブロック（SR5B3-4）でタブが切り替わった状態が残っている可能性があるため、
    // 「よく使う」タブへ明示的に戻してから本テストを開始する（renderRawTabsはボタン要素を都度再生成するため、
    // 参照は毎回取得し直す）
    const commonTabInit = [...doc.querySelectorAll('.raw-tab-btn')].find(b=>b.textContent==='よく使う');
    if(commonTabInit) commonTabInit.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));

    // RT5B4-1：よく使うタブで重複見出しが出ない
    const panelText = doc.getElementById('plPanel').textContent;
    rtCheck('RT5B4-1a：「まず選ぶ」という見出しが存在しない', !panelText.includes('まず選ぶ'));
    const headingLabels = [...doc.querySelectorAll('.raw-level-lbl, .tab-content-label, .pl-filter-h')].map(el=>el.textContent.trim());
    const dup1 = headingLabels.filter(t=>t==='よく使う').length;
    rtCheck('RT5B4-1b：「よく使う」という見出し文言がタブ名以外に重複していない', dup1===0, headingLabels);
    rtCheck('RT5B4-1c：「入口所見」という見出しが重複表示されない', !headingLabels.some(t=>t.includes('入口所見')));
    // ※Phase 5dで「よく使う」タブの実体チップ（#tabCommonChips）は廃止され、実体はStep1
    //   （.raw-step-section[data-step="1"]）に一本化された。「よく使う」タブは他タブと同様、
    //   既存チップを参照するボタン一覧（#tabOtherList）で内容を示す方式に変わったため、
    //   件数の検証対象もそれに合わせて更新する（検証意図：ENTRY_RAW_IDS相当30〜50件は変更なし）。
    const commonTabItems = doc.querySelectorAll('#tabOtherList .search-result-item');
    rtCheck('RT5B4-1d：タブ内容にはENTRY_RAW_IDS相当（30〜50件）の所見が表示される', commonTabItems.length>=30 && commonTabItems.length<=50, commonTabItems.length);
    rtCheck('RT5B4-1e：「よく使う」タブが初期状態でアクティブ表示される', doc.querySelector('.raw-tab-btn.active') && doc.querySelector('.raw-tab-btn.active').textContent==='よく使う');
    rtCheck('RT5B4-1f：旧「まず選ぶ入口所見」独立セクション（.raw-entry-section）が存在しない', !doc.querySelector('.raw-entry-section'));

    // RT5B4-2：タブ切り替えで選択状態が維持される
    rtSetChecked('f06', true);
    const checkedBeforeSwitch = new Set([...doc.querySelectorAll('input[type=checkbox]:checked')].map(el=>el.value));
    const giTabBtn = [...doc.querySelectorAll('.raw-tab-btn')].find(b=>b.textContent==='消化器');
    if(giTabBtn) giTabBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const f06cbMid = doc.querySelector('.pl-chip[data-fid="f06"]').querySelector('input');
    rtCheck('RT5B4-2a：消化器タブへ切り替えても選択状態が維持される', f06cbMid.checked===true);
    rtCheck('RT5B4-2b：「選択中の所見」に選択済み所見が残る', doc.getElementById('selectedRawArea').textContent.includes('下痢'));
    const checkedAfterSwitch = new Set([...doc.querySelectorAll('input[type=checkbox]:checked')].map(el=>el.value));
    rtCheck('RT5B4-2c：タブ切り替え前後で診断候補計算に使う選択集合が変化しない', checkedBeforeSwitch.size===checkedAfterSwitch.size && [...checkedBeforeSwitch].every(id=>checkedAfterSwitch.has(id)));
    const erTabBtn = [...doc.querySelectorAll('.raw-tab-btn')].find(b=>b.textContent==='救急');
    if(erTabBtn) erTabBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const f06cbMid2 = doc.querySelector('.pl-chip[data-fid="f06"]').querySelector('input');
    rtCheck('RT5B4-2d：救急タブへ切り替えても選択状態が維持される', f06cbMid2.checked===true);
    const commonTabBtn2 = [...doc.querySelectorAll('.raw-tab-btn')].find(b=>b.textContent==='よく使う');
    if(commonTabBtn2) commonTabBtn2.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    rtSetChecked('f06', false);

    // RT5B4-3：関連する追加所見は維持
    rtSetChecked('f01', true);
    const f01group = doc.querySelector('.ctx-group[data-entry="f01"]');
    rtCheck('RT5B4-3a：発熱選択で関連追加所見グループが表示される', f01group && f01group.style.display==='block');
    rtCheck('RT5B4-3b：関連追加所見に好中球増多が含まれる', f01group && !!f01group.querySelector('.pl-chip[data-fid="cbc_neutrophilia"]'));
    rtSetChecked('cbc_neutrophilia', true);
    rtSetChecked('f01', false);
    const nInputRt = doc.querySelector('.pl-chip[data-fid="cbc_neutrophilia"]').querySelector('input');
    rtCheck('RT5B4-3c：発熱を外してもチェック済みの好中球増多は選択中所見エリアに残る', nInputRt.checked===true && doc.getElementById('selectedRawArea').textContent.includes('好中球増多'));
    rtSetChecked('cbc_neutrophilia', false);

    // RT5B4-4：既存テスト維持（参照切れ・総数の最終確認）
    const finalChips4 = doc.querySelectorAll('.pl-chip');
    const finalUnique4 = new Set([...finalChips4].map(c=>c.getAttribute('data-fid')));
    rtCheck('RT5B4-4a：pl-chip総数504件を維持', finalChips4.length===504, finalChips4.length);
    rtCheck('RT5B4-4b：data-fidユニーク数504件を維持（参照切れなし）', finalUnique4.size===504, finalUnique4.size);

    doc.getElementById('plReset').click();
  })();

  console.log('Phase5b4 所見タブUI重複整理テスト: '+rtPass4+' PASS / '+rtFail4+' FAIL');

  // ==========================================================================
  // Phase 5c：主訴別優先表示（主訴カード→プロブレムリスト連携）のUI/DOM静的テスト
  // ==========================================================================
  let cpPass=0, cpFail=0;
  function cpCheck(name, ok, detail){
    if(ok) cpPass++; else cpFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }

  (function(){
    doc.getElementById('plReset').click();

    // CP5C-1：22主訴すべてに「プロブレムリストで所見を選ぶ」リンクがある
    const links = doc.querySelectorAll('.complaint-raw-link');
    cpCheck('CP5C-1：主訴カードのリンク数が22件（全主訴）', links.length===22, links.length);

    // CP5C-2：嘔吐（vomit）のリンクをクリックすると動的タブが表示され、内容が主訴に紐づく
    const vomitLink = doc.querySelector('#c-vomit .complaint-raw-link');
    cpCheck('CP5C-2a：嘔吐の主訴カードにリンクが存在する', !!vomitLink);
    if(vomitLink) vomitLink.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    cpCheck('CP5C-2b：クリックでプロブレムリストパネルが開く', doc.getElementById('plPanel').classList.contains('open'));
    const activeTabBtn = doc.querySelector('.raw-tab-btn.active');
    cpCheck('CP5C-2c：動的タブ（主訴名）がアクティブになる', activeTabBtn && activeTabBtn.textContent.includes('嘔吐'));
    const tabItems = [...doc.querySelectorAll('#tabOtherList .search-result-item')].map(el=>el.dataset.fid);
    cpCheck('CP5C-2d：嘔吐に紐づく所見（f05等）がタブ内容に含まれる', tabItems.includes('f05'), tabItems);

    // CP5C-3：タブ内容から所見をチェックできる（診断ロジックへの反映確認含む）
    const targetBtn = [...doc.querySelectorAll('#tabOtherList .search-result-item')].find(el=>el.dataset.fid==='hx_repeated_vomiting');
    cpCheck('CP5C-3a：タブ内に反復する嘔吐（hx_repeated_vomiting）が存在する', !!targetBtn);
    if(targetBtn) targetBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const targetCb = doc.querySelector('.pl-chip[data-fid="hx_repeated_vomiting"]').querySelector('input');
    cpCheck('CP5C-3b：クリックで該当所見がチェックされる', targetCb && targetCb.checked===true);
    cpCheck('CP5C-3c：「選択中の所見」に反映される', doc.getElementById('selectedRawArea').textContent.includes('反復する嘔吐'));

    // CP5C-4：別の主訴（発作）に切り替えても正しい内容が表示される
    doc.getElementById('plReset').click();
    const seizureLink = doc.querySelector('#c-seizure .complaint-raw-link');
    cpCheck('CP5C-4a：発作の主訴カードにリンクが存在する', !!seizureLink);
    if(seizureLink) seizureLink.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const seizureTabItems = [...doc.querySelectorAll('#tabOtherList .search-result-item')].map(el=>el.dataset.fid);
    cpCheck('CP5C-4b：発作に紐づく所見（f14等）に切り替わる', seizureTabItems.includes('f14'), seizureTabItems);
    cpCheck('CP5C-4c：嘔吐の所見（f05）は発作タブの内容に含まれない', !seizureTabItems.includes('f05'));

    // CP5C-5：診断ロジック・Raw/card/DPは変更されていないことの確認（既存テストで担保。ここではpl-chip総数のみ再確認）
    const finalChips = doc.querySelectorAll('.pl-chip');
    const finalUnique = new Set([...finalChips].map(c=>c.getAttribute('data-fid')));
    cpCheck('CP5C-5：pl-chip総数504・ユニーク数504を維持（参照切れなし）', finalChips.length===504 && finalUnique.size===504);

    doc.getElementById('plReset').click();
  })();

  console.log('Phase5c 主訴別優先表示テスト: '+cpPass+' PASS / '+cpFail+' FAIL');

  // ==========================================================================
  // Phase 5d：所見入力の段階表示（Step1〜4）のUI/DOM静的テスト
  // ==========================================================================
  let swPass=0, swFail=0;
  function swCheck(name, ok, detail){
    if(ok) swPass++; else swFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function swSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }
  // Step3/Step4の期待所見は、既存の「関連する追加所見」（ctx-group）に既に割り当てられている場合もあるため、
  // 「Step本体」または「ctx-group」いずれかに存在すれば合格とする（Phase 5b2〜5cで維持している既存の割り当てを尊重する設計）。
  function swInStepOrCtx(id, stepNum){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    if(chip.closest('.raw-step[data-step="'+stepNum+'"]') || chip.closest('.raw-step-section[data-step="'+stepNum+'"]')) return true;
    if(chip.closest('.ctx-group')) return true;
    return false;
  }

  (function(){
    doc.getElementById('plReset').click();

    // SW5D-1：Step分類の見出しが存在する
    const panelText = doc.getElementById('plPanel').textContent;
    swCheck('SW5D-1a：「来院時に選ぶ」が存在する', panelText.includes('来院時に選ぶ'));
    swCheck('SW5D-1b：「身体検査後に選ぶ」が存在する', panelText.includes('身体検査後に選ぶ'));
    swCheck('SW5D-1c：「検査後に選ぶ」が存在する', panelText.includes('検査後に選ぶ'));
    swCheck('SW5D-1d：「詳細・専門所見」が存在する', panelText.includes('詳細・専門所見'));

    // SW5D-2：Step1は開いた状態＋ENTRY_RAW_IDS相当を含む
    const step1El = doc.querySelector('.raw-step-section[data-step="1"]');
    swCheck('SW5D-2a：Step1セクションが存在する', !!step1El);
    const step1Body = step1El ? step1El.querySelector('.raw-step-body') : null;
    swCheck('SW5D-2b：Step1は初期状態で開いている（表示されている）', step1Body && step1Body.style.display==='block');
    const step1Count = step1El ? step1El.querySelectorAll('.pl-chip').length : 0;
    swCheck('SW5D-2c：Step1の所見数が30〜50件（ENTRY_RAW_IDS相当）', step1Count>=30 && step1Count<=50, step1Count);
    swCheck('SW5D-2d：Step1にua_stranguria（ENTRY_RAW_IDSの一部）が含まれる', !!(step1El && step1El.querySelector('.pl-chip[data-fid="ua_stranguria"]')));

    // SW5D-3：Step2〜4は初期状態で折りたたみ、トグルで開閉できる
    const step2El = doc.querySelector('.raw-step[data-step="2"]');
    const step3El = doc.querySelector('.raw-step[data-step="3"]');
    const step4El = doc.querySelector('.raw-step[data-step="4"]');
    swCheck('SW5D-3a：Step2は初期状態で折りたたまれている', step2El && !step2El.classList.contains('open'));
    swCheck('SW5D-3b：Step3は初期状態で折りたたまれている', step3El && !step3El.classList.contains('open'));
    swCheck('SW5D-3c：Step4は初期状態で折りたたまれている', step4El && !step4El.classList.contains('open'));
    if(step2El){
      const toggleBtn = step2El.querySelector('.raw-step-toggle');
      toggleBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
      swCheck('SW5D-3d：Step2はトグルボタンで展開できる', step2El.classList.contains('open'));
      toggleBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    }

    // SW5D-4：検査所見がStep3に分類される（またはStep3から選択できる＝既存のctx-group割り当てを含む）
    const step3Expected = ['cbc_neutrophilia','chem_bun_high','chem_crea_high','elec_k_high','chem_glucose_low','chem_bilirubin_high','us_gi_wall_thick','us_bileduct_dilation','us_renal_pelvis_dilation'];
    const step3Missing = step3Expected.filter(id=>!swInStepOrCtx(id, 3));
    swCheck('SW5D-4：検査所見（好中球増多・BUN・Cre・高K・低血糖・ビリルビン・腸管壁肥厚・胆管拡張・腎盂拡張）がStep3または関連追加所見から選択できる', step3Missing.length===0, step3Missing);

    // SW5D-5：詳細所見がStep4に分類される（またはStep4から選択できる）
    const step4Expected = ['fluid_intracellular_bacteria','cyto_round_cell_neoplasia','coag_pt_long','coag_aptt_long','coag_ddimer_high','inf_felv_positive','inf_fiv_positive'];
    const step4Missing = step4Expected.filter(id=>!swInStepOrCtx(id, 4));
    swCheck('SW5D-5：詳細所見（細胞内細菌・腫瘍性細胞診・PT/aPTT延長・Dダイマー・FIV/FeLV）がStep4または関連追加所見から選択できる', step4Missing.length===0, step4Missing);

    // SW5D-6：主訴別動的タブは維持される
    const vomitLink = doc.querySelector('#c-vomit .complaint-raw-link');
    swCheck('SW5D-6a：嘔吐の主訴カードにリンクが存在する', !!vomitLink);
    if(vomitLink) vomitLink.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const activeTabBtn = doc.querySelector('.raw-tab-btn.active');
    swCheck('SW5D-6b：動的タブ「嘔吐」がアクティブになる', activeTabBtn && activeTabBtn.textContent.includes('嘔吐'));
    const tabItems = [...doc.querySelectorAll('#tabOtherList .search-result-item')].map(el=>el.dataset.fid);
    swCheck('SW5D-6c：嘔吐関連所見（f05）がタブ内容に含まれる', tabItems.includes('f05'), tabItems);
    swCheck('SW5D-6d：Step分類表示（来院時に選ぶ）も維持される', doc.getElementById('plPanel').textContent.includes('来院時に選ぶ'));
    doc.getElementById('plReset').click();

    // SW5D-7：選択状態はStep開閉／タブ切り替えで消えない
    swSetChecked('cbc_neutrophilia', true);
    if(step3El){
      const toggleBtn3 = step3El.querySelector('.raw-step-toggle');
      toggleBtn3.dispatchEvent(new win.MouseEvent('click', {bubbles:true})); // 開く
      toggleBtn3.dispatchEvent(new win.MouseEvent('click', {bubbles:true})); // 閉じる
    }
    const cbcCb = doc.querySelector('.pl-chip[data-fid="cbc_neutrophilia"]').querySelector('input');
    swCheck('SW5D-7a：Step開閉後もチェック状態が維持される', cbcCb.checked===true);
    swCheck('SW5D-7b：「選択中の所見」に好中球増多が残る', doc.getElementById('selectedRawArea').textContent.includes('好中球増多'));
    const checkedSetNow = new Set([...doc.querySelectorAll('input[type=checkbox]:checked')].map(el=>el.value));
    swCheck('SW5D-7c：診断候補計算に使う選択集合に含まれる', checkedSetNow.has('cbc_neutrophilia'));
    swSetChecked('cbc_neutrophilia', false);

    // SW5D-8：直接検索は維持される
    const searchInput = doc.getElementById('rawSearchInput');
    searchInput.value = '高カリウム';
    searchInput.dispatchEvent(new win.Event('input', {bubbles:true}));
    const searchResults = [...doc.querySelectorAll('#rawSearchResults .search-result-item')];
    const kResult = searchResults.find(el=>el.dataset.fid==='elec_k_high');
    swCheck('SW5D-8a：「高カリウム」で検索すると高カリウム血症が見つかる', !!kResult, searchResults.map(el=>el.dataset.fid));
    if(kResult) kResult.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    swCheck('SW5D-8b：検索結果クリックで選択中の所見に反映される', doc.getElementById('selectedRawArea').textContent.includes('高カリウム血症'));
    searchInput.value=''; searchInput.dispatchEvent(new win.Event('input', {bubbles:true}));
    swSetChecked('elec_k_high', false);

    // SW5D-9：参照切れなし・総数維持
    const finalChips = doc.querySelectorAll('.pl-chip');
    const finalUnique = new Set([...finalChips].map(c=>c.getAttribute('data-fid')));
    swCheck('SW5D-9a：pl-chip総数504件を維持', finalChips.length===504, finalChips.length);
    swCheck('SW5D-9b：data-fidユニーク数504件を維持（参照切れなし）', finalUnique.size===504, finalUnique.size);

    doc.getElementById('plReset').click();
  })();

  console.log('Phase5d 段階表示テスト: '+swPass+' PASS / '+swFail+' FAIL');

  // ==========================================================================
  // Phase 5d-a：Step3/Step4の検査所見参照表示の補強 のUI/DOM静的テスト
  // ==========================================================================
  let daPass=0, daFail=0;
  function daCheck(name, ok, detail){
    if(ok) daPass++; else daFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function daSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }

  (function(){
    doc.getElementById('plReset').click();

    // SR5DA-1：Step3代表検査所見の参照表示
    const step3RefListEl = doc.getElementById('step3RefList');
    daCheck('SR5DA-1a：Step3に「代表的な検査所見」参照リストが存在する', !!step3RefListEl);
    const step3RefIds = [...doc.querySelectorAll('#step3RefList .search-result-item')].map(el=>el.dataset.fid);
    const step3ExpectedIds = ['cbc_neutrophilia','chem_bun_high','chem_crea_high','elec_k_high','chem_glucose_low','chem_bilirubin_high','us_gi_wall_thick','us_bileduct_dilation','us_renal_pelvis_dilation'];
    const step3MissingIds = step3ExpectedIds.filter(id=>!step3RefIds.includes(id));
    daCheck('SR5DA-1b：好中球増多・BUN・Cre・高K・低血糖・ビリルビン・腸管壁肥厚・胆管拡張・腎盂拡張がStep3参照リストにある', step3MissingIds.length===0, step3MissingIds);
    daCheck('SR5DA-1c：参照ボタンはpl-chipではなくsearch-result-item（既存IDへの参照）である', doc.querySelectorAll('#step3RefList .pl-chip').length===0 && doc.querySelectorAll('#step3RefList .search-result-item').length>0);

    // SR5DA-2：Step3参照ボタンで選択できる
    const neutroBtn = [...doc.querySelectorAll('#step3RefList .search-result-item')].find(el=>el.dataset.fid==='cbc_neutrophilia');
    daCheck('SR5DA-2a：Step3参照リストに好中球増多ボタンがある', !!neutroBtn);
    if(neutroBtn) neutroBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const neutroCb = doc.querySelector('.pl-chip[data-fid="cbc_neutrophilia"]').querySelector('input');
    daCheck('SR5DA-2b：クリックでcbc_neutrophiliaがcheckedになる', neutroCb.checked===true);
    daCheck('SR5DA-2c：「選択中の所見」に好中球増多が表示される', doc.getElementById('selectedRawArea').textContent.includes('好中球増多'));
    const checkedSetNow = new Set([...doc.querySelectorAll('input[type=checkbox]:checked')].map(el=>el.value));
    daCheck('SR5DA-2d：診断候補計算に使う選択集合に含まれる', checkedSetNow.has('cbc_neutrophilia'));
    daSetChecked('cbc_neutrophilia', false);

    // SR5DA-3：Step4代表詳細所見の参照表示
    const step4RefListEl = doc.getElementById('step4RefList');
    daCheck('SR5DA-3a：Step4に「代表的な詳細・専門所見」参照リストが存在する', !!step4RefListEl);
    const step4RefIds = [...doc.querySelectorAll('#step4RefList .search-result-item')].map(el=>el.dataset.fid);
    const step4ExpectedIds = ['fluid_intracellular_bacteria','cyto_round_cell_neoplasia','coag_pt_long','coag_aptt_long','coag_ddimer_high','inf_felv_positive','inf_fiv_positive'];
    const step4MissingIds = step4ExpectedIds.filter(id=>!step4RefIds.includes(id));
    daCheck('SR5DA-3b：細胞内細菌・腫瘍性細胞診・PT/aPTT延長・Dダイマー・FIV/FeLVがStep4参照リストにある', step4MissingIds.length===0, step4MissingIds);
    daCheck('SR5DA-3c：存在しないIDを使っていない（全ボタンが実在するpl-chipを参照）', step4RefIds.every(id=>!!doc.querySelector('.pl-chip[data-fid="'+id+'"]')));
    daCheck('SR5DA-3d：Step3参照リストのIDも全て実在するpl-chipを参照している', step3RefIds.every(id=>!!doc.querySelector('.pl-chip[data-fid="'+id+'"]')));

    // SR5DA-4：pl-chip総数とdata-fidユニーク数維持
    const allChips = doc.querySelectorAll('.pl-chip');
    const allUnique = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    daCheck('SR5DA-4a：pl-chip総数504件を維持', allChips.length===504, allChips.length);
    daCheck('SR5DA-4b：data-fidユニーク数504件を維持（参照ボタン追加でpl-chipは増えていない）', allUnique.size===504, allUnique.size);

    // 既存機能（選択中所見／直接検索／タブ／主訴別動的タブ）が本補強で壊れていないことの簡易確認
    const searchInputDa = doc.getElementById('rawSearchInput');
    searchInputDa.value = '胆管';
    searchInputDa.dispatchEvent(new win.Event('input', {bubbles:true}));
    const bileResult = [...doc.querySelectorAll('#rawSearchResults .search-result-item')].find(el=>el.dataset.fid==='us_bileduct_dilation');
    daCheck('SR5DA-5：直接検索（「胆管」）は本補強後も維持されている', !!bileResult);
    searchInputDa.value=''; searchInputDa.dispatchEvent(new win.Event('input', {bubbles:true}));

    const vomitLinkDa = doc.querySelector('#c-vomit .complaint-raw-link');
    if(vomitLinkDa) vomitLinkDa.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const activeTabDa = doc.querySelector('.raw-tab-btn.active');
    daCheck('SR5DA-6：主訴別動的タブ（嘔吐）は本補強後も維持されている', activeTabDa && activeTabDa.textContent.includes('嘔吐'));

    doc.getElementById('plReset').click();
  })();

  console.log('Phase5d-a Step参照表示補強テスト: '+daPass+' PASS / '+daFail+' FAIL');

  // ==========================================================================
  // Phase 5e：治療欄の高リスク用量・保留項目UI改善のUI/DOM静的テスト
  // ==========================================================================
  let tsPass=0, tsFail=0;
  function tsCheck(name, ok, detail){
    if(ok) tsPass++; else tsFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function tsCard(id){ return doc.getElementById(id); }
  function tsBadges(cardEl){ return [...cardEl.querySelectorAll('.tx-badge')].map(b=>b.textContent); }
  function tsHasHighRisk(cardEl, drugSubstr){
    const hr = cardEl.querySelector('.tx-highrisk');
    if(!hr) return false;
    if(!drugSubstr) return true;
    return [...hr.querySelectorAll('.tx-hr-pill')].some(p=>p.textContent.includes(drugSubstr));
  }

  (function(){
    // TS5E-1：高リスク用量UI（collapse_anaphylaxis／エピネフリン）
    const anaCard = tsCard('collapse_anaphylaxis');
    tsCheck('TS5E-1a：collapse_anaphylaxisカードが存在する', !!anaCard);
    tsCheck('TS5E-1b：高リスク薬剤UI（.tx-highrisk）が表示される', anaCard && !!anaCard.querySelector('.tx-highrisk'));
    tsCheck('TS5E-1c：エピネフリンが高リスク対象として認識される', anaCard && tsHasHighRisk(anaCard, 'エピネフリン'));
    tsCheck('TS5E-1d：用量文（0.01〜0.02mg/kg）が削除されずDOM内に残っている', anaCard && anaCard.textContent.includes('0.01〜0.02mg/kg'));
    tsCheck('TS5E-1e：注意喚起バッジ（モニタリング／避ける等）が表示される', anaCard && tsBadges(anaCard).length>0, anaCard && tsBadges(anaCard));

    // TS5E-2：中毒解毒薬UI
    const egCard = tsCard('vomit_ethylene_glycol_toxicosis');
    const apapCard = tsCard('jaundice_acetaminophen_toxicosis');
    tsCheck('TS5E-2a：エチレングリコール中毒に高リスク薬剤UIが表示される（4-メチルピラゾール等）', egCard && tsHasHighRisk(egCard, 'メチルピラゾール'));
    tsCheck('TS5E-2b：エチレングリコール中毒に成書確認/要確認/モニタリングのいずれかが表示される', egCard && ['成書確認','要確認','モニタリング'].some(b=>tsBadges(egCard).includes(b)));
    tsCheck('TS5E-2c：アセトアミノフェン中毒に高リスク薬剤UIが表示される（NAC）', apapCard && tsHasHighRisk(apapCard, 'アセチルシステイン'));
    tsCheck('TS5E-2d：アセトアミノフェン中毒に文献差あり/モニタリングのいずれかが表示される', apapCard && ['文献差あり','モニタリング'].some(b=>tsBadges(apapCard).includes(b)));
    tsCheck('TS5E-2e：中毒2カードとも用量文が削除されていない', egCard && egCard.textContent.includes('mg/kg') && apapCard && apapCard.textContent.includes('mg/kg'));

    // TS5E-3：電解質・DKA UI
    const dkaCard = tsCard('vomit_diabetic_ketoacidosis');
    const electCard = tsCard('pupd_electrolyte_disorders');
    const obstrCard = tsCard('dysuria_urethral_obstruction');
    tsCheck('TS5E-3a：DKAカードに高リスク薬剤UI（インスリンCRI/カリウム）が表示される', dkaCard && (tsHasHighRisk(dkaCard,'インスリン')||tsHasHighRisk(dkaCard,'カリウム')));
    tsCheck('TS5E-3b：電解質異常カードに高リスク薬剤UIまたは成書確認/院内プロトコル確認バッジが表示される', electCard && (!!electCard.querySelector('.tx-highrisk') || ['成書確認','院内プロトコル確認'].some(b=>tsBadges(electCard).includes(b))));
    tsCheck('TS5E-3c：尿道閉塞カードに高K/心電図モニタ関連のモニタリングバッジが表示される', obstrCard && tsBadges(obstrCard).includes('モニタリング'));
    tsCheck('TS5E-3d：尿道閉塞カードの本文に高カリウムに関する用量調整の記述が保持されている', obstrCard && obstrCard.textContent.includes('K'));

    // TS5E-4：抗菌薬適正使用UI
    const septicCard = tsCard('fever_septic_peritonitis');
    const utiCard = tsCard('dysuria_urinary_tract_infection');
    const aspCard = tsCard('cough_aspiration_pneumonia');
    const cholCard = tsCard('jaundice_cholangitis_cat');
    tsCheck('TS5E-4a：敗血症性腹膜炎カードのmonitor欄に培養・感受性・デエスカレーションの記述が保持され、モニタリングバッジが付く', septicCard && septicCard.textContent.includes('感受性') && septicCard.textContent.includes('デエスカレーション') && tsBadges(septicCard).includes('モニタリング'));
    tsCheck('TS5E-4b：尿路感染症カードのavoid欄にroutineな抗菌薬投与回避の記述が保持され、避けるバッジが付く', utiCard && utiCard.textContent.includes('routine') && tsBadges(utiCard).includes('避ける'));
    tsCheck('TS5E-4c：誤嚥性肺炎カードのesc欄に培養結果に基づく変更の記述が保持される', aspCard && aspCard.textContent.includes('培養結果'));
    tsCheck('TS5E-4d：猫の胆管炎カードに感染除外バッジまたは高リスク薬剤UIが表示される', cholCard && (tsBadges(cholCard).includes('感染除外') || !!cholCard.querySelector('.tx-highrisk')));

    // TS5E-5：NSAIDs/ステロイド注意UI
    const ulcerCard = tsCard('vomit_gastritis_gastric_ulcer');
    const pancCard = tsCard('vomit_pancreatitis');
    const traumaCard = tsCard('lameness_soft_tissue_trauma');
    const lymphomaCard = tsCard('sb_diarrhea_alimentary_lymphoma');
    tsCheck('TS5E-5a：胃炎・胃潰瘍カードに併用注意バッジが表示される', ulcerCard && tsBadges(ulcerCard).includes('併用注意'));
    tsCheck('TS5E-5b：膵炎カードのavoid欄にNSAIDs回避の記述が保持され、避けるバッジが付く', pancCard && pancCard.textContent.includes('NSAIDs') && tsBadges(pancCard).includes('避ける'));
    tsCheck('TS5E-5c：軟部組織外傷カードに併用注意バッジが表示される', traumaCard && tsBadges(traumaCard).includes('併用注意'));
    tsCheck('TS5E-5d：消化器型リンパ腫カードに専門判断バッジが表示される（腫瘍診断前ステロイド注意の文脈）', lymphomaCard && tsBadges(lymphomaCard).includes('専門判断'));

    // TS5E-6：保留/専門判断UI
    const featCard = tsCard('collapse_feline_aortic_thromboembolism');
    const dicCard = tsCard('bleeding_disseminated_intravascular_coagulation');
    const mctCard = tsCard('mass_mast_cell_tumor');
    tsCheck('TS5E-6a：猫大動脈血栓塞栓症カードに専門判断バッジが表示される', featCard && tsBadges(featCard).includes('専門判断'));
    tsCheck('TS5E-6b：DICカードに専門判断バッジが表示される', dicCard && tsBadges(dicCard).includes('専門判断'));
    tsCheck('TS5E-6c：肥満細胞腫カードに専門判断バッジまたは高リスク薬剤UI（化学療法/分子標的）が表示される', mctCard && (tsBadges(mctCard).includes('専門判断') || tsHasHighRisk(mctCard, '化学療法')));

    // TS5E-7：既存治療本文の保持（用量数値が変更されていないことのサンプル確認）
    tsCheck('TS5E-7a：collapse_anaphylaxisの用量数値（0.01〜0.02mg/kg）が変更されていない', anaCard && anaCard.textContent.includes('0.01〜0.02mg/kg'));
    tsCheck('TS5E-7b：vomit_diabetic_ketoacidosisの用量数値（0.05〜0.1U/kg/h）が変更されていない', dkaCard && dkaCard.textContent.includes('0.05〜0.1U/kg/h'));
    tsCheck('TS5E-7c：fever_septic_peritonitisの用量数値（20〜30mg/kg）が変更されていない', septicCard && septicCard.textContent.includes('20〜30mg/kg'));

    // TS5E-8：既存機能・件数の維持
    const allChips = doc.querySelectorAll('.pl-chip');
    const allUnique = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    tsCheck('TS5E-8a：pl-chip総数504件を維持', allChips.length===504, allChips.length);
    tsCheck('TS5E-8b：data-fidユニーク数504件を維持（参照切れなし）', allUnique.size===504, allUnique.size);
  })();

  console.log('Phase5e 治療欄安全UIテスト: '+tsPass+' PASS / '+tsFail+' FAIL');

  // ==========================================================================
  // Phase 5f：救急モード強化・初期安定化パネルのUI/DOM静的テスト
  // ==========================================================================
  let erfPass=0, erfFail=0;
  function erfCheck(name, ok, detail){
    if(ok) erfPass++; else erfFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function erfSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }
  function erfCardHit(key){
    const el = doc.querySelector('.er-stab-card[data-key="'+key+'"]');
    return el && el.classList.contains('er-stab-hit');
  }

  (function(){
    doc.getElementById('plReset').click();
    const erToggleEl = doc.getElementById('erToggle');
    const panelEl = doc.getElementById('erStabilizePanel');
    // 救急モードOFFの状態から開始
    if(doc.body.classList.contains('er-on')) erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));

    // ER5F-1：救急初期安定化パネル
    erfCheck('ER5F-1a：救急モードOFFではパネルが非表示', panelEl.style.display==='none');
    erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    erfCheck('ER5F-1b：救急モードONで「救急初期安定化」パネルが表示される', panelEl.style.display==='block' && doc.getElementById('erStabilizePanel').textContent.includes('救急初期安定化'));
    const stabCards = doc.querySelectorAll('.er-stab-card');
    const stabKeys = [...stabCards].map(c=>c.dataset.key);
    erfCheck('ER5F-1c：A/B・C・D・U・Tなどのカードが存在する', ['AB','C','D','U','T'].every(k=>stabKeys.includes(k)), stabKeys);
    erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    erfCheck('ER5F-1d：救急モードOFFで通常表示に戻る', panelEl.style.display==='none');
    erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true})); // 以降のテストのためONに戻す

    doc.getElementById('plToggle').click();

    // ER5F-2：呼吸困難所見でA/Bカード強調
    erfSetChecked('f13', true);
    erfCheck('ER5F-2a：呼吸困難選択でA/Bカードが強調される', erfCardHit('AB'));
    const abText = doc.querySelector('.er-stab-card[data-key="AB"]').textContent;
    erfCheck('ER5F-2b：酸素投与・ストレス最小化・胸水/気胸評価の文言が表示される', abText.includes('酸素投与') && abText.includes('ストレス最小化') && abText.includes('胸水'));
    erfSetChecked('f13', false);
    erfCheck('ER5F-2c：所見解除でA/Bカードの強調が外れる', !erfCardHit('AB'));

    // ER5F-3：虚脱/出血所見でCカード強調
    erfSetChecked('pe_collapse_shock', true);
    erfCheck('ER5F-3a：虚脱選択でCカードが強調される', erfCardHit('C'));
    const cText = doc.querySelector('.er-stab-card[data-key="C"]').textContent;
    erfCheck('ER5F-3b：血糖・乳酸・PCV/TP・FAST/POCUSの文言が表示される', cText.includes('血糖') && cText.includes('乳酸') && cText.includes('PCV/TP') && cText.includes('FAST/POCUS'));
    erfSetChecked('pe_collapse_shock', false);

    // ER5F-4：発作/低血糖でDカード強調
    erfSetChecked('f14', true);
    erfCheck('ER5F-4a：発作選択でDカードが強調される', erfCardHit('D'));
    const dText = doc.querySelector('.er-stab-card[data-key="D"]').textContent;
    erfCheck('ER5F-4b：発作停止・低血糖確認・体温確認の文言が表示される', dText.includes('発作停止') && dText.includes('低血糖') && dText.includes('体温上昇を確認'));
    erfSetChecked('f14', false);

    // ER5F-5：尿閉/高KでUカード強調
    erfSetChecked('elec_k_high', true);
    erfCheck('ER5F-5a：高K選択でUカードが強調される', erfCardHit('U'));
    const uText = doc.querySelector('.er-stab-card[data-key="U"]').textContent;
    erfCheck('ER5F-5b：ECG・鎮静/麻酔前確認・高K評価の文言が表示される', uText.includes('ECG') && uText.includes('鎮静/麻酔前') && uText.includes('高K'));
    erfSetChecked('elec_k_high', false);

    // ER5F-6：中毒曝露でTカード強調
    erfSetChecked('hx_toxin_exposure_known', true);
    erfCheck('ER5F-6a：中毒/誤食選択でTカードが強調される', erfCardHit('T'));
    const tText = doc.querySelector('.er-stab-card[data-key="T"]').textContent;
    erfCheck('ER5F-6b：摂取時刻/量・催吐/吸着・中毒相談・解毒薬要確認の文言が表示される', tText.includes('摂取したか') && tText.includes('催吐') && tText.includes('中毒相談窓口') && tText.includes('高リスク'));
    erfSetChecked('hx_toxin_exposure_known', false);

    // ER5F-7：救急候補カードの視認性
    const dkaCardEl = doc.getElementById('vomit_diabetic_ketoacidosis');
    erfCheck('ER5F-7a：dangerカードに救急バッジが表示される', !!(dkaCardEl && dkaCardEl.querySelector('.mnm-mini')));
    erfCheck('ER5F-7b：高リスク治療UIがあるカードには高リスク治療の簡易表示がある', !!(dkaCardEl && dkaCardEl.querySelector('.hr-mini')));
    erfSetChecked('chem_glucose_high', true);
    erfSetChecked('ua_ketonuria', true);
    const dkaCand = [...doc.querySelectorAll('.cand-card')].find(c=>c.dataset.card==='vomit_diabetic_ketoacidosis');
    erfCheck('ER5F-7c：候補疾患カード（cand-card）にも救急/高リスク治療バッジが表示される', !!(dkaCand && dkaCand.querySelector('.cand-er-badge') && dkaCand.querySelector('.cand-hr-badge')));
    erfCheck('ER5F-7d：候補順位（role属性）は変更されていない', !!(dkaCand && dkaCand.dataset.role==='primary'));
    erfSetChecked('chem_glucose_high', false);
    erfSetChecked('ua_ketonuria', false);

    // ER5F-8：既存機能維持
    const allChips = doc.querySelectorAll('.pl-chip');
    const allUnique = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    erfCheck('ER5F-8a：pl-chip総数504件を維持', allChips.length===504, allChips.length);
    erfCheck('ER5F-8b：data-fidユニーク数504件を維持（参照切れなし）', allUnique.size===504, allUnique.size);

    doc.getElementById('plReset').click();
    if(doc.body.classList.contains('er-on')) erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
  })();

  console.log('Phase5f 救急モード強化テスト: '+erfPass+' PASS / '+erfFail+' FAIL');

  // ==========================================================================
  // Phase 5g：スマホ操作性・検索性・最終UI調整のUI/DOM静的テスト
  // ==========================================================================
  let uiPass=0, uiFail=0;
  function uiCheck(name, ok, detail){
    if(ok) uiPass++; else uiFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function uiSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }
  function uiSearch(q){
    const el = doc.getElementById('rawSearchInput');
    el.value = q;
    el.dispatchEvent(new win.Event('input', {bubbles:true}));
    return [...doc.querySelectorAll('#rawSearchResults .search-result-item')].map(b=>b.dataset.fid);
  }

  (function(){
    doc.getElementById('plReset').click();
    doc.getElementById('plToggle').click();

    // UI5G-1：スマホ操作性に関する構造
    const sampleChip = doc.querySelector('.pl-chip');
    uiCheck('UI5G-1a：主要チップ（.pl-chip）が存在しタップ可能な構造を持つ', !!sampleChip);
    const tabsEl = doc.getElementById('rawTabs');
    uiCheck('UI5G-1b：タブ一覧が横並び構造（raw-tab-btnの並び）で崩れない', tabsEl && tabsEl.querySelectorAll('.raw-tab-btn').length>0);
    uiSetChecked('f01', true);
    const selArea = doc.getElementById('selectedRawArea');
    uiCheck('UI5G-1c：選択中所見エリアが存在し内容を保持する構造である', selArea && selArea.querySelectorAll('.sel-chip').length===1);
    uiSetChecked('f01', false);

    // UI5G-2：検索性
    uiCheck('UI5G-2a：「高K」で検索するとelec_k_highが見つかる', uiSearch('高K').includes('elec_k_high'));
    uiCheck('UI5G-2b：「カリウム」で検索しても所見が見つかる', uiSearch('カリウム').length>0);
    uiCheck('UI5G-2c：「好中球」で検索すると所見が見つかる', uiSearch('好中球').length>0);
    uiCheck('UI5G-2d：「WBC」で検索すると所見が見つかる', uiSearch('WBC').length>0);
    uiCheck('UI5G-2e：「胆管」で検索すると所見が見つかる（us_bileduct_dilation等）', uiSearch('胆管').includes('us_bileduct_dilation'));
    const srItem = doc.querySelector('#rawSearchResults .search-result-item');
    uiCheck('UI5G-2f：検索結果にカテゴリが表示される', srItem && !!srItem.querySelector('.sr-cat'));
    uiSetChecked('elec_k_high', true);
    uiSearch('高K');
    const kResultSelected = [...doc.querySelectorAll('#rawSearchResults .search-result-item')].find(b=>b.dataset.fid==='elec_k_high');
    uiCheck('UI5G-2g：選択済み所見が検索結果で分かる（選択済みバッジ）', kResultSelected && !!kResultSelected.querySelector('.sr-badge'));
    uiSetChecked('elec_k_high', false);
    doc.getElementById('rawSearchInput').value=''; doc.getElementById('rawSearchInput').dispatchEvent(new win.Event('input', {bubbles:true}));
    const zeroHitMsg = (()=>{ const r = uiSearch('ｚｚｚ存在しない語ｚｚｚ'); return doc.getElementById('rawSearchResults').textContent; })();
    uiCheck('UI5G-2h：検索結果0件時に分かりやすい文言が表示される', zeroHitMsg.includes('見つかりません') || zeroHitMsg.includes('一致'));
    doc.getElementById('rawSearchInput').value=''; doc.getElementById('rawSearchInput').dispatchEvent(new win.Event('input', {bubbles:true}));

    // UI5G-3：選択中所見エリア
    uiSetChecked('f01', true);
    uiSetChecked('f06', true);
    uiCheck('UI5G-3a：選択数が表示される', doc.getElementById('selCount').textContent.includes('2件'));
    const xBtn = doc.querySelector('#selectedRawArea .sel-x[data-fid="f01"]');
    uiCheck('UI5G-3b：×ボタンが存在する', !!xBtn);
    if(xBtn) xBtn.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    uiCheck('UI5G-3c：×クリックで解除される', !doc.querySelector('.pl-chip[data-fid="f01"]').querySelector('input').checked);
    // hidden所見の確認（発熱→好中球増多→発熱解除）
    uiSetChecked('f01', true);
    uiSetChecked('cbc_neutrophilia', true);
    uiSetChecked('f01', false);
    uiCheck('UI5G-3d：hiddenになった所見（好中球増多）も選択中エリアに残る', doc.getElementById('selectedRawArea').textContent.includes('好中球増多'));
    doc.getElementById('plReset').click();
    uiCheck('UI5G-3e：plResetで選択中の所見エリアが空表示になる', doc.getElementById('selectedRawArea').textContent.includes('まだ所見が選択されていません'));

    // UI5G-4：折りたたみ/タブのアクセシビリティ
    const step2ToggleEl = doc.querySelector('.raw-step[data-step="2"] .raw-step-toggle');
    uiCheck('UI5G-4a：Step折りたたみボタンにaria-expandedがある', step2ToggleEl && step2ToggleEl.hasAttribute('aria-expanded'));
    const beforeExpanded = step2ToggleEl.getAttribute('aria-expanded');
    step2ToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    uiCheck('UI5G-4b：クリックでaria-expandedの値が切り替わる', step2ToggleEl.getAttribute('aria-expanded') !== beforeExpanded);
    step2ToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const activeTabBtn = doc.querySelector('.raw-tab-btn.active');
    uiCheck('UI5G-4c：タブにaria-selectedがある', activeTabBtn && activeTabBtn.hasAttribute('aria-selected'));
    const erToggleEl = doc.getElementById('erToggle');
    const erBefore = erToggleEl.getAttribute('aria-pressed');
    erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    uiCheck('UI5G-4d：救急モードON/OFFでaria-pressedが同期する', erToggleEl.getAttribute('aria-pressed') !== erBefore);
    erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));

    // UI5G-5：救急パネル・高リスク治療UIの維持
    erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const stabPanel = doc.getElementById('erStabilizePanel');
    uiCheck('UI5G-5a：救急初期安定化パネルが維持されている', stabPanel && stabPanel.style.display==='block');
    uiSetChecked('f13', true);
    const abHit = doc.querySelector('.er-stab-card[data-key="AB"]').classList.contains('er-stab-hit');
    uiCheck('UI5G-5b：選択所見による強調が維持されている', abHit);
    uiSetChecked('f13', false);
    erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    const anaCard = doc.getElementById('collapse_anaphylaxis');
    uiCheck('UI5G-5c：高リスク治療UIが維持されている', !!(anaCard && anaCard.querySelector('.tx-highrisk')));
    uiSetChecked('chem_glucose_high', true);
    uiSetChecked('ua_ketonuria', true);
    const dkaCand = [...doc.querySelectorAll('.cand-card')].find(c=>c.dataset.card==='vomit_diabetic_ketoacidosis');
    uiCheck('UI5G-5d：候補疾患カードの救急/高リスクバッジが維持されている', !!(dkaCand && dkaCand.querySelector('.cand-er-badge') && dkaCand.querySelector('.cand-hr-badge')));
    uiSetChecked('chem_glucose_high', false);
    uiSetChecked('ua_ketonuria', false);

    // UI5G-6：既存機能・件数維持
    const allChips = doc.querySelectorAll('.pl-chip');
    const allUnique = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    uiCheck('UI5G-6a：pl-chip総数504件を維持', allChips.length===504, allChips.length);
    uiCheck('UI5G-6b：data-fidユニーク数504件を維持（参照切れなし）', allUnique.size===504, allUnique.size);

    doc.getElementById('plReset').click();
    if(doc.body.classList.contains('er-on')) erToggleEl.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
  })();

  console.log('Phase5g 最終UI調整テスト: '+uiPass+' PASS / '+uiFail+' FAIL');

  // ==========================================================================
  // Phase 6：generic beta準備・シナリオスモークテストのUI/DOM静的テスト
  // ==========================================================================
  let gbPass=0, gbFail=0;
  function gbCheck(name, ok, detail){
    if(ok) gbPass++; else gbFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }

  (function(){
    doc.getElementById('plReset').click();

    // GB6-1：β版表示
    const bodyText = doc.body.textContent;
    gbCheck('GB6-1a：アプリ内にβ版表示がある', bodyText.includes('β版'));
    gbCheck('GB6-1b：最終判断は担当獣医師が行う趣旨が含まれる', bodyText.includes('担当獣医師'));
    gbCheck('GB6-1c：治療用量は成書/院内プロトコル確認の趣旨が含まれる', bodyText.includes('成書・院内プロトコル'));

    // GB6-2：主要UI維持
    doc.getElementById('plToggle').click();
    gbCheck('GB6-2a：選択中所見エリアが存在する', !!doc.getElementById('selectedRawArea'));
    gbCheck('GB6-2b：直接検索欄が存在する', !!doc.getElementById('rawSearchInput'));
    gbCheck('GB6-2c：所見カテゴリタブが存在する', doc.querySelectorAll('.raw-tab-btn').length>=10);
    const vomitLinkGb = doc.querySelector('#c-vomit .complaint-raw-link');
    gbCheck('GB6-2d：主訴別動的タブの導線（主訴カードのリンク）が存在する', !!vomitLinkGb);
    gbCheck('GB6-2e：Step1〜4が存在する', !!doc.querySelector('.raw-step-section[data-step="1"]') && !!doc.querySelector('.raw-step[data-step="4"]'));
    gbCheck('GB6-2f：Step3/Step4代表参照が存在する', !!doc.getElementById('step3RefList') && !!doc.getElementById('step4RefList'));
    gbCheck('GB6-2g：救急初期安定化パネルが存在する', !!doc.getElementById('erStabilizePanel'));
    const anaCardGb = doc.getElementById('collapse_anaphylaxis');
    gbCheck('GB6-2h：高リスク治療UIが存在する（アナフィラキシーの高リスク薬剤UI）', !!(anaCardGb && anaCardGb.querySelector('.tx-highrisk')));

    // GB6-3：代表シナリオ静的確認（phase6_beta_test_scenarios.md）
    let scenarioMd = null;
    const candidatePaths = [];
    if(process.argv[2]) candidatePaths.push(path.join(path.dirname(process.argv[2]), 'phase6_beta_test_scenarios.md'));
    candidatePaths.push(path.join(process.cwd(), 'phase6_beta_test_scenarios.md'));
    for(const p of candidatePaths){
      try{ scenarioMd = fs.readFileSync(p, 'utf8'); break; }catch(e){ /* try next */ }
    }
    if(scenarioMd){
      const scenarioHeadings = (scenarioMd.match(/^### シナリオ\d+/gm) || []);
      gbCheck('GB6-3a：phase6_beta_test_scenarios.mdに20シナリオが記載されている', scenarioHeadings.length===20, scenarioHeadings.length);
      const hasInputFindings = /入力する所見/.test(scenarioMd);
      const hasExpectedCandidates = /期待される候補疾患/.test(scenarioMd);
      const hasUiCheck = /確認すべきUI/.test(scenarioMd);
      gbCheck('GB6-3b：各シナリオに入力所見・期待候補・確認UIの項目がある', hasInputFindings && hasExpectedCandidates && hasUiCheck);
    } else {
      gbCheck('GB6-3a：phase6_beta_test_scenarios.mdが読み込めた（同一出力フォルダに配置）', false, 'ファイルが見つかりませんでした: '+candidatePaths.join(', '));
      gbCheck('GB6-3b：各シナリオに入力所見・期待候補・確認UIの項目がある', false, 'mdファイル未検出のためスキップ');
    }

    // GB6-4：既存テスト維持（総数・参照切れの最終確認）
    const allChips = doc.querySelectorAll('.pl-chip');
    const allUnique = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    gbCheck('GB6-4a：pl-chip総数504件を維持', allChips.length===504, allChips.length);
    gbCheck('GB6-4b：data-fidユニーク数504件を維持（参照切れなし）', allUnique.size===504, allUnique.size);

    doc.getElementById('plReset').click();
  })();

  console.log('Phase6 generic beta テスト: '+gbPass+' PASS / '+gbFail+' FAIL');

  // ==========================================================================
  // Phase 7：field feedback準備・実地試用パッケージのUI/DOM静的テスト
  // （アプリ本体は原則無変更のため、既存Phase 6テストの再確認＋Phase 7ドキュメント存在確認のみの軽量テスト）
  // ==========================================================================
  let ffPass=0, ffFail=0;
  function ffCheck(name, ok, detail){
    if(ok) ffPass++; else ffFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }

  (function(){
    doc.getElementById('plReset').click();

    // β版表示が維持されている
    const bodyText = doc.body.textContent;
    ffCheck('FF7-1：β版表示が維持されている', bodyText.includes('β版') && bodyText.includes('担当獣医師'));

    // 主要UIが維持されている
    doc.getElementById('plToggle').click();
    ffCheck('FF7-2a：選択中所見エリアが維持されている', !!doc.getElementById('selectedRawArea'));
    ffCheck('FF7-2b：直接検索欄が維持されている', !!doc.getElementById('rawSearchInput'));
    ffCheck('FF7-2c：所見カテゴリタブが維持されている', doc.querySelectorAll('.raw-tab-btn').length>=10);
    ffCheck('FF7-2d：Step1〜4が維持されている', !!doc.querySelector('.raw-step-section[data-step="1"]') && !!doc.querySelector('.raw-step[data-step="4"]'));
    ffCheck('FF7-2e：Step3/Step4代表参照が維持されている', !!doc.getElementById('step3RefList') && !!doc.getElementById('step4RefList'));
    ffCheck('FF7-2f：救急初期安定化パネルが維持されている', !!doc.getElementById('erStabilizePanel'));
    const anaCardFf = doc.getElementById('collapse_anaphylaxis');
    ffCheck('FF7-2g：高リスク治療UIが維持されている', !!(anaCardFf && anaCardFf.querySelector('.tx-highrisk')));
    const vomitLinkFf = doc.querySelector('#c-vomit .complaint-raw-link');
    ffCheck('FF7-2h：主訴別動的タブの導線が維持されている', !!vomitLinkFf);

    // アプリ内データ件数が維持されている
    const allChips = doc.querySelectorAll('.pl-chip');
    const allUnique = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    ffCheck('FF7-3a：pl-chip総数504件を維持', allChips.length===504, allChips.length);
    ffCheck('FF7-3b：data-fidユニーク数504件を維持（参照切れなし）', allUnique.size===504, allUnique.size);

    // Phase 7ドキュメントの存在・項目確認（同一出力フォルダにある場合のみ）
    function readSibling(name){
      const candidates = [];
      if(process.argv[2]) candidates.push(path.join(path.dirname(process.argv[2]), name));
      candidates.push(path.join(process.cwd(), name));
      for(const p of candidates){
        try{ return fs.readFileSync(p, 'utf8'); }catch(e){ /* try next */ }
      }
      return null;
    }
    const formMd = readSibling('phase7_feedback_form.md');
    const obsMd = readSibling('phase7_observation_sheet.md');
    const protoMd = readSibling('phase7_trial_protocol.md');
    if(formMd){
      ffCheck('FF7-4a：phase7_feedback_form.mdに問題分類欄がある', /問題分類/.test(formMd) && /治療本文\/用量の問題/.test(formMd));
      ffCheck('FF7-4b：phase7_feedback_form.mdに操作性・検索性・救急モード・治療欄の項目がある', /操作性/.test(formMd) && /検索性/.test(formMd) && /救急モード/.test(formMd) && /治療欄/.test(formMd));
    } else {
      ffCheck('FF7-4a：phase7_feedback_form.mdが見つかった', false, 'ファイル未検出（同一フォルダに配置してください）');
    }
    if(obsMd){
      ffCheck('FF7-5a：phase7_observation_sheet.mdに観察ポイント・行動観察・医学的観察・介入記録がある', /観察ポイント/.test(obsMd) && /行動観察/.test(obsMd) && /医学的観察/.test(obsMd) && /介入記録/.test(obsMd));
    } else {
      ffCheck('FF7-5a：phase7_observation_sheet.mdが見つかった', false, 'ファイル未検出（同一フォルダに配置してください）');
    }
    if(protoMd){
      ffCheck('FF7-6a：phase7_trial_protocol.mdに目的・対象者・試用方法・注意事項がある', /目的/.test(protoMd) && /対象者/.test(protoMd) && /試用方法/.test(protoMd) && /注意事項/.test(protoMd));
    } else {
      ffCheck('FF7-6a：phase7_trial_protocol.mdが見つかった', false, 'ファイル未検出（同一フォルダに配置してください）');
    }

    doc.getElementById('plReset').click();
  })();

  console.log('Phase7 field feedback準備テスト: '+ffPass+' PASS / '+ffFail+' FAIL');

  // ==========================================================================
  // Phase 7b：発症経過入力軸のレベル1実装のUI/DOM静的テスト
  // ==========================================================================
  let odaPass=0, odaFail=0;
  function odaCheck(name, ok, detail){
    if(ok) odaPass++; else odaFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function odaSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }
  function odaClickOnset(key){
    const opt = [...doc.querySelectorAll('.onset-option')].find(o=>o.dataset.onsetKey===key);
    if(opt) opt.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    return opt;
  }

  (function(){
    doc.getElementById('plReset').click();
    doc.getElementById('plToggle').click();

    // ODA-1：経過選択UIが存在する
    const panelText = doc.getElementById('plPanel').textContent;
    odaCheck('ODA-1a：「経過を選ぶ」が表示される', panelText.includes('経過を選ぶ'));
    const onsetKeys = [...doc.querySelectorAll('.onset-option')].map(o=>o.dataset.onsetKey);
    odaCheck('ODA-1b：急性・亜急性・慢性・反復性・不明の5択が表示される', ['acute','subacute','chronic','recurrent','unknown'].every(k=>onsetKeys.includes(k)), onsetKeys);

    // ODA-2：経過選択が表示エリアに反映される
    odaClickOnset('acute');
    const displayText = doc.getElementById('onsetCurrentDisplay').textContent;
    odaCheck('ODA-2a：「急性」を選ぶと経過表示エリアに反映される', displayText.includes('急性'));
    odaCheck('ODA-2b：経過表示は通常のRaw所見（選択中の所見エリア）とは区別されている', !doc.getElementById('selectedRawArea').textContent.includes('現在の経過'));

    // ODA-3：経過未選択は候補計算に影響しない
    doc.getElementById('onsetClearBtn').dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    odaSetChecked('f05', true); odaSetChecked('hx_foreign_body_ingestion', true); odaSetChecked('f12', true);
    const candNoOnset = doc.querySelectorAll('.cand-card').length;
    const dpNoOnset = doc.querySelectorAll('#derivedList .dp-item').length;
    odaClickOnset('acute');
    const candAcute = doc.querySelectorAll('.cand-card').length;
    const dpAcute = doc.querySelectorAll('#derivedList .dp-item').length;
    odaCheck('ODA-3：経過未選択→急性選択で候補疾患・派生プロブレムの件数が変わらない（診断計算に未使用）', candNoOnset===candAcute && dpNoOnset===dpAcute, {candNoOnset,candAcute,dpNoOnset,dpAcute});
    odaSetChecked('f05', false); odaSetChecked('hx_foreign_body_ingestion', false); odaSetChecked('f12', false);

    // ODA-4：plResetで経過選択が解除される
    odaClickOnset('chronic');
    odaCheck('ODA-4a：慢性を選ぶと表示される', doc.getElementById('onsetCurrentDisplay').textContent.includes('慢性'));
    doc.getElementById('plReset').click();
    odaCheck('ODA-4b：plResetで経過選択が解除される（表示エリアが空になる）', doc.getElementById('onsetCurrentDisplay').textContent.trim()==='');

    // ODA-5：慢性選択時でも救急候補は消えない
    odaClickOnset('chronic');
    odaSetChecked('ua_stranguria', true);
    odaSetChecked('pe_large_bladder', true);
    odaSetChecked('elec_k_high', true);
    const obstrCand = [...doc.querySelectorAll('.cand-card')].find(c=>c.dataset.card==='dysuria_urethral_obstruction');
    odaCheck('ODA-5a：慢性選択時でも尿道閉塞（critical/danger候補）が表示される', !!obstrCand);
    const erToggleOda = doc.getElementById('erToggle');
    const erBeforeOda = erToggleOda.getAttribute('aria-pressed');
    erToggleOda.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    odaCheck('ODA-5b：慢性選択中でも救急モードの挙動（aria-pressed同期）は変わらない', erToggleOda.getAttribute('aria-pressed') !== erBeforeOda);
    erToggleOda.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    odaSetChecked('ua_stranguria', false); odaSetChecked('pe_large_bladder', false); odaSetChecked('elec_k_high', false);
    doc.getElementById('onsetClearBtn').dispatchEvent(new win.MouseEvent('click', {bubbles:true}));

    // ODA-6：既存件数維持
    const allChips = doc.querySelectorAll('.pl-chip');
    const allUnique = new Set([...allChips].map(c=>c.getAttribute('data-fid')));
    odaCheck('ODA-6a：pl-chip総数504件を維持（経過選択UIはpl-chipとして作っていない）', allChips.length===504, allChips.length);
    odaCheck('ODA-6b：data-fidユニーク数504件を維持（参照切れなし）', allUnique.size===504, allUnique.size);
    odaCheck('ODA-6c：経過選択のオプション自体はpl-chipクラスを持たない', doc.querySelectorAll('.onset-option.pl-chip').length===0);

    doc.getElementById('plReset').click();
  })();

  console.log('Phase7b 発症経過入力軸テスト: '+odaPass+' PASS / '+odaFail+' FAIL');

  // ==========================================================================
  // Phase 7c：性別・避妊去勢ステータス入力軸のレベル1実装のUI/DOM静的テスト
  // ==========================================================================
  let snaPass=0, snaFail=0;
  function snaCheck(name, ok, detail){
    if(ok) snaPass++; else snaFail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function snaSetChecked(id, val){
    const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
    if(!chip) return false;
    const cb = chip.querySelector('input');
    cb.checked = val;
    cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    return true;
  }
  function snaClickOnset(key){
    const opt = [...doc.querySelectorAll('#onsetOptions .onset-option')].find(o=>o.dataset.onsetKey===key);
    if(opt) opt.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    return opt;
  }
  function snaClickSexNeuter(key){
    const opt = [...doc.querySelectorAll('#sexNeuterOptions .onset-option')].find(o=>o.dataset.sexneuterKey===key);
    if(opt) opt.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    return opt;
  }
  function snaCandSignature(){
    return [...doc.querySelectorAll('.cand-card')].map(c=>c.dataset.card+':'+c.dataset.role).join(',');
  }
  function snaDpSignature(){
    return [...doc.querySelectorAll('#derivedList .dp-item')].map(el=>el.dataset.pid||'').join(',');
  }
  function snaForceRecompute(){
    const checked = doc.querySelector('.pl-chip input[type=checkbox]:checked');
    if(checked){
      checked.dispatchEvent(new win.Event('change', {bubbles:true}));
    }
  }

  (function(){
    doc.getElementById('plReset').click();
    doc.getElementById('plToggle').click();

    // SNA-1：UI表示
    const panelText = doc.getElementById('plPanel').textContent;
    snaCheck('SNA-1a：性別・避妊去勢セクションが存在する', panelText.includes('性別・避妊去勢を選ぶ'));
    const sexKeys = [...doc.querySelectorAll('#sexNeuterOptions .onset-option')].map(o=>o.dataset.sexneuterKey);
    snaCheck('SNA-1b：5つの選択肢（未去勢雄/去勢雄/未避妊雌/避妊雌/不明）が存在する', ['intact_male','neutered_male','intact_female','spayed_female','unknown'].every(k=>sexKeys.includes(k)), sexKeys);
    snaCheck('SNA-1c：性別選択を解除ボタンが存在する', !!doc.getElementById('sexNeuterClearBtn'));
    snaCheck('SNA-1d：現在の選択表示エリアが存在する', !!doc.getElementById('sexNeuterCurrentDisplay'));

    // SNA-2：選択表示
    snaClickSexNeuter('neutered_male');
    snaCheck('SNA-2a：「去勢雄」を選ぶと専用表示エリアに反映される', doc.getElementById('sexNeuterCurrentDisplay').textContent.includes('去勢雄'));
    snaCheck('SNA-2b：「選択中の所見」エリアには表示されない', !doc.getElementById('selectedRawArea').textContent.includes('性別'));
    snaClickSexNeuter('neutered_male'); // 同じ選択肢を再クリック→解除
    snaCheck('SNA-2c：同じ選択肢を再クリックすると解除される', doc.getElementById('sexNeuterCurrentDisplay').textContent.trim()==='');

    // SNA-3：診断計算への非影響（性別選択後に候補・派生プロブレムを強制再計算した上でcard_id・role・順序・problem_idの完全一致を確認）
    snaSetChecked('f05', true); snaSetChecked('hx_foreign_body_ingestion', true); snaSetChecked('f12', true);
    snaForceRecompute();
    const candBase = snaCandSignature();
    const dpBase = snaDpSignature();
    let allMatch = true;
    ['intact_male','neutered_male','intact_female','spayed_female','unknown'].forEach(key=>{
      snaClickSexNeuter(key);
      snaForceRecompute();
      const candNow = snaCandSignature();
      const dpNow = snaDpSignature();
      if(candNow!==candBase || dpNow!==dpBase) allMatch = false;
      snaClickSexNeuter(key); // 解除して次へ
      snaForceRecompute();
    });
    snaCheck('SNA-3：性別未選択/5択いずれを選んでも（選択後に候補・派生プロブレムを再計算した上で）候補card_id・role・順序・派生プロブレムproblem_idが完全一致する', allMatch);
    snaSetChecked('f05', false); snaSetChecked('hx_foreign_body_ingestion', false); snaSetChecked('f12', false);

    // SNA-4：plReset
    snaClickOnset('acute');
    snaClickSexNeuter('intact_female');
    doc.getElementById('plReset').click();
    snaCheck('SNA-4a：plResetで性別選択が解除される', doc.getElementById('sexNeuterCurrentDisplay').textContent.trim()==='');
    snaCheck('SNA-4b：plResetで経過選択も同時に解除される', doc.getElementById('onsetCurrentDisplay').textContent.trim()==='');
    snaCheck('SNA-4c：plResetでRaw/FINDINGSも通常どおり解除される', [...doc.querySelectorAll('input[type=checkbox]:checked')].length===0);

    // SNA-5：性別関連疾患を消さない
    snaClickSexNeuter('spayed_female');
    snaSetChecked('us_uterine_fluid', true);
    const pyometraCand = [...doc.querySelectorAll('.cand-card')].find(c=>c.dataset.card==='pupd_pyometra');
    snaCheck('SNA-5a：避妊雌選択時でも子宮蓄膿症候補（pupd_pyometra）が表示される（us_uterine_fluid）', !!pyometraCand);
    snaSetChecked('us_uterine_fluid', false);
    snaClickSexNeuter('spayed_female');

    snaClickSexNeuter('neutered_male');
    snaSetChecked('us_prostate_enlarged', true);
    const prostateCand = [...doc.querySelectorAll('.cand-card')].find(c=>c.dataset.card==='dysuria_prostatic_disease');
    snaCheck('SNA-5b：去勢雄選択時でも前立腺疾患候補が表示される（us_prostate_enlarged）', !!prostateCand);
    snaSetChecked('us_prostate_enlarged', false);
    snaClickSexNeuter('neutered_male');

    snaClickSexNeuter('intact_male');
    snaSetChecked('ua_stranguria', true); snaSetChecked('pe_large_bladder', true); snaSetChecked('elec_k_high', true);
    const obstrCandSna = [...doc.querySelectorAll('.cand-card')].find(c=>c.dataset.card==='dysuria_urethral_obstruction');
    snaCheck('SNA-5c：未去勢雄選択時でも救急/critical候補（尿道閉塞）が消えない', !!obstrCandSna);
    snaSetChecked('ua_stranguria', false); snaSetChecked('pe_large_bladder', false); snaSetChecked('elec_k_high', false);
    snaClickSexNeuter('intact_male');

    // SNA-6：救急モード非影響
    snaClickSexNeuter('intact_female');
    const erToggleSna = doc.getElementById('erToggle');
    const erBeforeSna = erToggleSna.getAttribute('aria-pressed');
    erToggleSna.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    snaCheck('SNA-6a：性別選択中でも救急モードのaria-pressedが正常に切り替わる', erToggleSna.getAttribute('aria-pressed') !== erBeforeSna);
    const stabPanelSna = doc.getElementById('erStabilizePanel');
    snaCheck('SNA-6b：救急初期安定化パネルの挙動が変わらない（表示される）', stabPanelSna && stabPanelSna.style.display==='block');
    erToggleSna.dispatchEvent(new win.MouseEvent('click', {bubbles:true}));
    snaClickSexNeuter('intact_female');

    // SNA-7：件数維持
    const allChipsSna = doc.querySelectorAll('.pl-chip');
    const allUniqueSna = new Set([...allChipsSna].map(c=>c.getAttribute('data-fid')));
    snaCheck('SNA-7a：pl-chip総数504件を維持', allChipsSna.length===504, allChipsSna.length);
    snaCheck('SNA-7b：data-fidユニーク数504件を維持', allUniqueSna.size===504, allUniqueSna.size);
    snaCheck('SNA-7c：性別選択要素が.pl-chipを持たない', doc.querySelectorAll('#sexNeuterOptions .pl-chip').length===0);
    snaCheck('SNA-7d：性別選択要素がdata-fidを持たない', [...doc.querySelectorAll('#sexNeuterOptions .onset-option')].every(o=>!o.hasAttribute('data-fid')));

    // SNA-8：Phase 7bとの独立性
    snaClickOnset('acute');
    snaClickSexNeuter('neutered_male');
    snaCheck('SNA-8a：急性選択後に去勢雄を選んでも急性選択が保持される', doc.getElementById('onsetCurrentDisplay').textContent.includes('急性'));
    snaClickOnset('acute'); snaClickOnset('chronic');
    snaCheck('SNA-8b：去勢雄選択後に慢性へ変更しても去勢雄が保持される', doc.getElementById('sexNeuterCurrentDisplay').textContent.includes('去勢雄'));
    doc.getElementById('onsetClearBtn').click();
    snaCheck('SNA-8c：経過選択解除ボタンで性別選択は残る', doc.getElementById('sexNeuterCurrentDisplay').textContent.includes('去勢雄'));
    snaClickOnset('chronic');
    doc.getElementById('sexNeuterClearBtn').click();
    snaCheck('SNA-8d：性別選択解除ボタンで経過選択は残る', doc.getElementById('onsetCurrentDisplay').textContent.includes('慢性'));
    doc.getElementById('plReset').click();
    snaCheck('SNA-8e：plResetでは両方解除される', doc.getElementById('onsetCurrentDisplay').textContent.trim()==='' && doc.getElementById('sexNeuterCurrentDisplay').textContent.trim()==='');
  })();

  console.log('Phase7c 性別・避妊去勢入力軸テスト: '+snaPass+' PASS / '+snaFail+' FAIL');

  // ==========================================================================
  // Phase 7d：field feedback資料更新（発症経過軸・性別軸対応）の静的確認テスト
  // アプリ本体・診断ロジック・候補疾患・治療内容には一切触れず、Phase 7dで更新した
  // Markdown/テキスト資料の項目が揃っているかのみを確認する軽量テスト。
  // ==========================================================================
  let fd7Pass=0, fd7Fail=0;
  function fd7Check(name, ok, detail){
    if(ok) fd7Pass++; else fd7Fail++;
    console.log((ok?'✓ PASS':'✗ FAIL')+' '+name);
    if(!ok && detail) console.log('   detail:', detail);
  }
  function fd7ReadSibling(name){
    const candidates = [];
    if(process.argv[2]) candidates.push(path.join(path.dirname(process.argv[2]), name));
    candidates.push(path.join(process.cwd(), name));
    for(const p of candidates){
      try{ return fs.readFileSync(p, 'utf8'); }catch(e){ /* try next */ }
    }
    return null;
  }

  (function(){
    const protoMd = fd7ReadSibling('phase7_trial_protocol.md');
    const formMd = fd7ReadSibling('phase7_feedback_form.md');
    const obsMd = fd7ReadSibling('phase7_observation_sheet.md');
    const sumTxt = fd7ReadSibling('phase7_field_feedback_summary.txt');

    if(protoMd){
      fd7Check('FD7-1a：phase7_trial_protocol.mdに発症経過軸の観察方法がある', /発症経過軸の観察/.test(protoMd));
      fd7Check('FD7-1b：phase7_trial_protocol.mdに性別・避妊去勢軸の観察方法がある', /性別・避妊去勢軸の観察/.test(protoMd));
    } else {
      fd7Check('FD7-1a：phase7_trial_protocol.mdが見つかった', false, 'ファイル未検出（同一フォルダに配置してください）');
      fd7Check('FD7-1b：phase7_trial_protocol.mdが見つかった', false, 'ファイル未検出（同一フォルダに配置してください）');
    }

    if(formMd){
      fd7Check('FD7-2a：phase7_feedback_form.mdに発症経過入力のセクションがある', /発症経過入力について/.test(formMd));
      fd7Check('FD7-2b：phase7_feedback_form.mdに性別・避妊去勢入力のセクションがある', /性別・避妊去勢入力について/.test(formMd));
      fd7Check('FD7-2c：phase7_feedback_form.mdに問題分類がある', /問題分類/.test(formMd) && /発症経過軸/.test(formMd) && /性別・避妊去勢軸/.test(formMd));
      fd7Check('FD7-2d：phase7_feedback_form.mdに重要度分類がある', /重要度/.test(formMd) && /Critical/.test(formMd) && /Request/.test(formMd));
    } else {
      ['FD7-2a','FD7-2b','FD7-2c','FD7-2d'].forEach(n=>fd7Check(n+'：phase7_feedback_form.mdが見つかった', false, 'ファイル未検出'));
    }

    if(obsMd){
      fd7Check('FD7-3a：phase7_observation_sheet.mdに発症経過軸の観察欄がある', /発症経過軸の観察/.test(obsMd));
      fd7Check('FD7-3b：phase7_observation_sheet.mdに性別・避妊去勢軸の観察欄がある', /性別・避妊去勢軸の観察/.test(obsMd));
    } else {
      fd7Check('FD7-3a：phase7_observation_sheet.mdが見つかった', false, 'ファイル未検出');
      fd7Check('FD7-3b：phase7_observation_sheet.mdが見つかった', false, 'ファイル未検出');
    }

    if(sumTxt){
      fd7Check('FD7-4a：phase7_field_feedback_summary.txtにONSET／SEX分類がある', /ONSET/.test(sumTxt) && /SEX/.test(sumTxt));
      fd7Check('FD7-4b：phase7_field_feedback_summary.txtに集計欄がある', /集計欄/.test(sumTxt));
    } else {
      fd7Check('FD7-4a：phase7_field_feedback_summary.txtが見つかった', false, 'ファイル未検出');
      fd7Check('FD7-4b：phase7_field_feedback_summary.txtが見つかった', false, 'ファイル未検出');
    }
  })();

  console.log('Phase7d field feedback資料更新テスト: '+fd7Pass+' PASS / '+fd7Fail+' FAIL');

  // UI遷移テスト：疾患カードを開くでパネルが閉じてカードへ移動するか
  function testJumpToDiseaseCard(){
    doc.getElementById('plReset').click();
    const panel = doc.getElementById('plPanel');
    const toggle = doc.getElementById('plToggle');
    if(!panel.classList.contains('open')) toggle.click();

    ['chem_bilirubin_high','hx_anorexia_persistent','chem_alp_ggt_disproportion_cat','us_liver_diffuse','us_no_bileduct_dilation'].forEach(id=>{
      const chip = doc.querySelector('.pl-chip[data-fid="'+id+'"]');
      if(!chip){ console.log('  ✗ Raw項目が見つからない:', id); return; }
      const cb = chip.querySelector('input');
      cb.checked = true;
      cb.dispatchEvent(new win.Event('change', {bubbles:true}));
    });

    const targetBtn = [...doc.querySelectorAll('[data-jumpcard]')].find(el=>el.dataset.jumpcard==='jaundice_feline_hepatic_lipidosis');
    if(!targetBtn){
      console.log('✗ FAIL UI遷移：猫肝リピドーシスのjumpボタンがない');
      return Promise.resolve(false);
    }
    targetBtn.click();

    return new Promise(resolve=>{
      setTimeout(()=>{
        const card = doc.getElementById('jaundice_feline_hepatic_lipidosis');
        const complaint = doc.getElementById('c-jaundice');
        const ok = !panel.classList.contains('open') &&
          toggle.getAttribute('aria-pressed') === 'false' &&
          complaint && complaint.open === true &&
          card && card.classList.contains('flash2');
        console.log((ok?'✓ PASS':'✗ FAIL') + ' UI遷移：疾患カードを開くでパネルを閉じてカードへ移動');
        resolve(ok);
      }, 250);
    });
  }
  const uiOk = await testJumpToDiseaseCard();

  // 総合結果: p2Pass/p2Fail（PHASE2_CASES 4件）は totalPass/totalFail に含まれる。
  // 5.55までの既存テスト328件 + PHASE2_CASES 4件 + UI遷移テスト1件 = 332件（phase2_diagnostic_text_audit_extract.txt参照）
  const totalPass = pass+sepPass+felPass+vomPass+uriPass+respPass+nbfPass+endoPass+demPass+orthoPass+fixPass+reproPass+reproFixPass+entPass+ent2Pass+toxPass+toxAPass+toxBPass+auditPass+audit2Pass+rtPass+p2Pass+ts3bPass+as3cPass+ns3dPass+et3ePass+tw3fPass+lg3gPass+fz4Pass+crPass+srPass+rtPass4+cpPass+swPass+daPass+tsPass+erfPass+uiPass+gbPass+ffPass+odaPass+snaPass+fd7Pass;
  const totalFail = fail+sepFail+felFail+vomFail+uriFail+respFail+nbfFail+endoFail+demFail+orthoFail+fixFail+reproFail+reproFixFail+entFail+ent2Fail+toxFail+toxAFail+toxBFail+auditFail+audit2Fail+rtFail+p2Fail+ts3bFail+as3cFail+ns3dFail+et3eFail+tw3fFail+lg3gFail+fz4Fail+crFail+srFail+rtFail4+cpFail+swFail+daFail+tsFail+erfFail+uiFail+gbFail+ffFail+odaFail+snaFail+fd7Fail;
  console.log('\n=== 総合結果 ===');
  console.log('非UIテスト（PASS/FAIL/計）: '+totalPass+' / '+totalFail+' / '+(totalPass+totalFail));
  console.log('UI遷移テスト: '+(uiOk?'1 PASS / 0 FAIL':'0 PASS / 1 FAIL'));
  console.log('総PASS: '+(totalPass+(uiOk?1:0))+' / 総FAIL: '+(totalFail+(uiOk?0:1))+' / 総計: '+(totalPass+totalFail+1));
  process.exit((totalFail+(uiOk?0:1))>0?1:0);
}, 500);
