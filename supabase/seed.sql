-- Keystone 시드 — 참조 데이터 (DATA_MODEL.md §9)
-- source/data.jsx 의 STRATEGIES / EXEC_CATS / EXEC_STRATEGIES 를 그대로 INSERT.
-- desc/fields/icon 등 정적 UI 메타는 packages/core 상수로 유지 (DATA_MODEL §4 노트).

-- strategies (관점/lens) — st1~st8
insert into strategies (id, name, color, model, thresholds, grade_focus, sort) values
  ('st1', '{"en":"Quality P/E","ko":"퀄리티 PER"}', '#4CB782', 'PER',
   '{"PER":{"dir":"low","good":15,"warn":40},"ROE":{"dir":"high","good":25,"warn":8},"OPM":{"dir":"high","good":32,"warn":9}}',
   array['PER','ROE','OPM'], 0),
  ('st2', '{"en":"Growth DCF","ko":"성장주 DCF"}', '#4C8DFF', 'DCF',
   '{"REVG":{"dir":"high","good":20,"warn":4},"OPM":{"dir":"high","good":32,"warn":9},"ROE":{"dir":"high","good":25,"warn":8}}',
   array['REVG','OPM','ROE'], 1),
  ('st3', '{"en":"Asset / Book P/B","ko":"가치·자산주 PBR"}', '#2D9CDB', 'PBR',
   '{"PBR":{"dir":"low","good":1.2,"warn":8},"ROE":{"dir":"high","good":25,"warn":8},"DIVY":{"dir":"high","good":1.4,"warn":0.2}}',
   array['PBR','ROE','DIVY'], 2),
  ('st4', '{"en":"Dividend DDM","ko":"배당주 DDM"}', '#F2994A', 'DDM',
   '{"DIVY":{"dir":"high","good":1.4,"warn":0.2},"NPM":{"dir":"high","good":25,"warn":8},"DEBT":{"dir":"low","good":33,"warn":120}}',
   array['DIVY','NPM','DEBT'], 3),
  ('st5', '{"en":"Cyclical EV/EBITDA","ko":"경기민감 EV/EBITDA"}', '#F2C94C', 'EV',
   '{"OPM":{"dir":"high","good":32,"warn":9},"DEBT":{"dir":"low","good":33,"warn":120},"GPM":{"dir":"high","good":52,"warn":30}}',
   array['OPM','DEBT','GPM'], 4),
  ('st6', '{"en":"Platform P/S","ko":"플랫폼 PSR"}', '#BB6BD9', 'PSR',
   '{"REVG":{"dir":"high","good":20,"warn":4},"GPM":{"dir":"high","good":52,"warn":30},"NPM":{"dir":"high","good":25,"warn":8}}',
   array['REVG','GPM','NPM'], 5),
  ('st7', '{"en":"Sum-of-the-Parts","ko":"부분합산 SOTP"}', '#9B6BD9', 'PBR',
   '{"PBR":{"dir":"low","good":1.2,"warn":8},"DEBT":{"dir":"low","good":33,"warn":120},"ROE":{"dir":"high","good":25,"warn":8}}',
   array['PBR','DEBT','ROE'], 6),
  ('st8', '{"en":"Turnaround","ko":"턴어라운드"}', '#2BB3A3', 'PER',
   '{"OPM":{"dir":"high","good":32,"warn":9},"DEBT":{"dir":"low","good":33,"warn":120},"REVG":{"dir":"high","good":20,"warn":4}}',
   array['OPM','DEBT','REVG'], 7)
on conflict (id) do nothing;

-- exec_categories (전역 프리셋 — user_id null)
insert into exec_categories (id, label, user_id, sort) values
  ('accum',  '{"en":"Accumulate","ko":"분할·누적"}', null, 0),
  ('rebal',  '{"en":"Rebalance","ko":"리밸런싱"}',   null, 1),
  ('signal', '{"en":"Signal","ko":"시그널"}',        null, 2)
on conflict (id) do nothing;

-- exec_strategies (실행 방식) — ex1~ex7
insert into exec_strategies (id, name, color, category_id, sort) values
  ('ex1', '{"en":"Infinite Buying","ko":"무한매수법"}',          '#BB6BD9', 'accum',  0),
  ('ex2', '{"en":"Dollar-Cost Averaging","ko":"정액분할매수"}',  '#4C8DFF', 'accum',  1),
  ('ex3', '{"en":"Value Averaging","ko":"밸류애버리징"}',        '#F2994A', 'accum',  2),
  ('ex4', '{"en":"Grid Trading","ko":"그리드 매매"}',            '#9B6BD9', 'accum',  3),
  ('ex5', '{"en":"Value Rebalance","ko":"밸류리밸런싱"}',        '#4CB782', 'rebal',  4),
  ('ex6', '{"en":"60/40 Allocation","ko":"6:4 자산배분"}',       '#2D9CDB', 'rebal',  5),
  ('ex7', '{"en":"Momentum","ko":"모멘텀"}',                     '#2D9CDB', 'signal', 6)
on conflict (id) do nothing;
