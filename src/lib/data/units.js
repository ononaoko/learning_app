// src/lib/data/units.js

export const units = [

    {
      name: '算数文章題',
      type: 'category',
      sub_units: [
        {
          name: 'テスト',
          type: 'subcategory',
          sub_units: [
            { name: '代数', type: 'unit', id: 'algebra' },
          ]
        },
        {
          name: '割合と比',
          type: 'subcategory',
          sub_units: [
            { name: '割合と比の基本', type: 'unit', id: 'basic_ratio_proportion' },
            { name: '濃度', type: 'unit', id: 'concentration' },
            { name: '相当算', type: 'unit', id: 'equivalent_calc' },
            { name: '仕事算', type: 'unit', id: 'work_calc' },
            { name: '売買利益', type: 'unit', id: 'profit_loss' },
            { name: '倍数算', type: 'unit', id: 'multiple_calc' },
            { name: '年齢算', type: 'unit', id: 'age_calc' }
          ]
        },
        {
          name: '速さ',
          type: 'subcategory',
          sub_units: [
            { name: '旅人算', type: 'unit', id: 'traveler_calc' },
            { name: '速さの基本', type: 'unit', id: 'basic_speed' },
            { name: '速さと道のりのグラフ', type: 'unit', id: 'speed_distance_graph' },
            { name: '流水算', type: 'unit', id: 'current_calc' },
            { name: '時計算', type: 'unit', id: 'clock_calc' },
            { name: '通過算', type: 'unit', id: 'passing_calc' },
            { name: '歩数・歩幅', type: 'unit', id: 'steps_stride' }
          ]
        },
        {
          name: '規則性',
          type: 'subcategory',
          sub_units: [
            { name: '約束に従って考える問題', type: 'unit', id: 'rule_based_problems' },
            { name: '図形を使った数列', type: 'unit', id: 'geometric_sequences' },
            { name: '植木算・周期算', type: 'unit', id: 'tree_cycle_calc' },
            { name: '等差数列', type: 'unit', id: 'arithmetic_sequences' },
            { name: '方陣算', type: 'unit', id: 'magic_square_calc' }
          ]
        },
        {
          name: '数の性質',
          type: 'subcategory',
          sub_units: [
            { name: '約数・倍数', type: 'unit', id: 'divisors_multiples' },
            { name: '整数・小数・分数', type: 'unit', id: 'integers_decimals_fractions' }
          ]
        },
        {
          name: '和と差に関する問題',
          type: 'subcategory',
          sub_units: [
            { name: '差集め算', type: 'unit', id: 'difference_sum_calc' },
            { name: '過不足算', type: 'unit', id: 'excess_deficiency_calc' },
            { name: '平均とのべ', type: 'unit', id: 'average_total_calc' },
            { name: 'つるかめ算', type: 'unit', id: 'crane_turtle_calc' },
            { name: '消去算', type: 'unit', id: 'elimination_calc' },
            { name: '集合', type: 'unit', id: 'set_problems' }
          ]
        },
        {
          name: '場合の数',
          type: 'subcategory',
          sub_units: [
            { name: '図形と場合の数', type: 'unit', id: 'geometry_combinations' },
            { name: '並べ方', type: 'unit', id: 'arrangements' },
            { name: '組み合わせ', type: 'unit', id: 'combinations' },
            { name: '数の性質と場合の数', type: 'unit', id: 'number_property_combinations' },
            { name: 'サイコロの問題・じゃんけんの問題', type: 'unit', id: 'dice_janken_problems' }
          ]
        }
      ]
    }
  ];