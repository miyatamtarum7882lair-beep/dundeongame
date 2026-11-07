# M_dangeon 敵キャラ設定アーカイブ

- 敵キャラ18体のコンセプトシート（`enemies/*.yaml`）
- 敵ID一覧：`enemy_ids.csv`（Excel向けUTF-8 BOM）と `enemy_ids.txt`
- 共通戦闘仕様：`COMMON_RULES.md`
- 元の参考画像：`reference_images/`（利用可能な添付画像）

**重要：** 本パックのYAMLは会話で作成した長文シートを**要約・再構成した版**です。元の回答をそのまま完全転記したものではありません。特にセリフ、音・エフェクトの詳細は汎用的な仮案として補完しており、元回答の表現を完全保存していません。ID、名前、属性、ランク、技名、得意デバフ・方向性および共通ルールを優先して整理しています。

**未確定事項：** シーフちゃんのbasic、シスターさんのuniqueなど、元会話で「提案」とされていたランクは提案のままです。複合属性「胸 / 手」は新しい手属性導入後の表記を維持しています。`全` の解釈もキャラごとの定義を参照してください。


## バランス調整 v2 追記
- BALANCING_GUIDE.md：全18体の役割と全体バランス
- BALANCE_MATRIX.csv：キャラ別役割・4軸評価・対抗手段
- DEBUFF_CATALOG.csv：既存＋追加提案デバフ一覧
- enemies/*.yaml：すべて balance セクションを追加（固定の既存階層を維持）
- reference_images/：元ZIPの参考画像を維持


## v3更新
各敵の `balance.persistentSystem` と `balance.enemyGrowth` を追加。`PERSISTENT_AND_GROWTH_V3.md` と `PERSISTENT_DEBUFF_RECOVERY_V3.csv` を参照。v2のコンセプト・技は維持。追加内容は基本的に提案であり、数値確定ではありません。

## v4 追加内容
- `CONDITIONING_SYSTEM_V4.yaml`：反復被弾・発症・永続定着の共通ルール
- `CONDITIONING_MATRIX_V4.csv`：18体の固有蓄積デバフ・連携・回復ルート一覧
- `CONDITIONING_GUIDE_V4.md`：ハートの虜の具体的な連携例
- 各 `enemies/*.yaml` に `balance.conditioning` を追記（元の内容は維持）


## v5 追加：技別進化条件
- `TECHNIQUE_EVOLUTION_GUIDE_V5.md`: 技別進化と上位技解放の関係・共通条件
- `TECHNIQUE_EVOLUTION_MATRIX_V5.md`: 18体の全技進化条件表
- `enemies/*.yaml` の各 `skills.normal/bind/specials[]/advanced.evolution`: 技別進化の条件、強化内容、対抗手段
- 既存の v4/v3 ファイルをそのまま保存。進化の詳細はv5を優先してください。
