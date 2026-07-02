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

-- securities 초기 목록 (DATA_MODEL.md §9 — source/securities.jsx 부트스트랩,
-- 마일스톤 4에서 DART/EDGAR 실데이터로 덮어씀. last_close = 프로토타입 mock price)
insert into securities (ticker, name, market, currency, sector, gics, exchange, shares_out, last_close) values
  ('005930', '{"en":"Samsung Electronics","ko":"삼성전자"}',     'KR', 'KRW', '{"en":"Semiconductors","ko":"반도체"}', '{"en":"Information Technology","ko":"정보기술"}',   'KOSPI',  5969,  71200),
  ('000660', '{"en":"SK hynix","ko":"SK하이닉스"}',              'KR', 'KRW', '{"en":"Semiconductors","ko":"반도체"}', '{"en":"Information Technology","ko":"정보기술"}',   'KOSPI',  728,   178000),
  ('035720', '{"en":"Kakao","ko":"카카오"}',                     'KR', 'KRW', '{"en":"Internet","ko":"인터넷"}',       '{"en":"Communication Services","ko":"커뮤니케이션"}','KOSPI',  4434,  41200),
  ('005380', '{"en":"Hyundai Motor","ko":"현대차"}',             'KR', 'KRW', '{"en":"Autos","ko":"자동차"}',          '{"en":"Consumer Discretionary","ko":"경기소비재"}',  'KOSPI',  209,   248000),
  ('035420', '{"en":"NAVER","ko":"NAVER"}',                      'KR', 'KRW', '{"en":"Internet","ko":"인터넷"}',       '{"en":"Communication Services","ko":"커뮤니케이션"}','KOSPI',  164,   168500),
  ('005490', '{"en":"POSCO Holdings","ko":"POSCO홀딩스"}',       'KR', 'KRW', '{"en":"Materials","ko":"소재"}',        '{"en":"Materials","ko":"소재"}',                     'KOSPI',  84,    392000),
  ('207940', '{"en":"Samsung Biologics","ko":"삼성바이오로직스"}','KR', 'KRW', '{"en":"Bio","ko":"바이오"}',            '{"en":"Health Care","ko":"헬스케어"}',               'KOSPI',  71,    982000),
  ('AAPL',   '{"en":"Apple","ko":"Apple"}',                      'US', 'USD', '{"en":"Hardware","ko":"하드웨어"}',     '{"en":"Information Technology","ko":"정보기술"}',   'NASDAQ', 15204, 198.50),
  ('NVDA',   '{"en":"NVIDIA","ko":"NVIDIA"}',                    'US', 'USD', '{"en":"Semiconductors","ko":"반도체"}', '{"en":"Information Technology","ko":"정보기술"}',   'NASDAQ', 2460,  1185.00),
  ('GOOGL',  '{"en":"Alphabet","ko":"Alphabet"}',                'US', 'USD', '{"en":"Internet","ko":"인터넷"}',       '{"en":"Communication Services","ko":"커뮤니케이션"}','NASDAQ', 12300, 176.20),
  ('TSLA',   '{"en":"Tesla","ko":"Tesla"}',                      'US', 'USD', '{"en":"Autos","ko":"자동차"}',          '{"en":"Consumer Discretionary","ko":"경기소비재"}',  'NASDAQ', 3180,  242.00),
  ('MSFT',   '{"en":"Microsoft","ko":"Microsoft"}',              'US', 'USD', '{"en":"Software","ko":"소프트웨어"}',   '{"en":"Information Technology","ko":"정보기술"}',   'NASDAQ', 7430,  448.00),
  ('AMD',    '{"en":"AMD","ko":"AMD"}',                          'US', 'USD', '{"en":"Semiconductors","ko":"반도체"}', '{"en":"Information Technology","ko":"정보기술"}',   'NASDAQ', 1620,  162.40),
  ('TSM',    '{"en":"TSMC","ko":"TSMC"}',                        'US', 'USD', '{"en":"Semiconductors","ko":"반도체"}', '{"en":"Information Technology","ko":"정보기술"}',   'NYSE',   5187,  174.30)
on conflict (ticker) do nothing;

-- security_financials 부트스트랩 (DATA_MODEL.md §9 — source/data.jsx FIN_SEED, source='seed')
-- DART/EDGAR 어댑터 미실행 머신에서도 재무 화면이 뜨도록 하는 베이스라인.
-- `pnpm --filter @keystone/server sync:financials` 가 실데이터로 덮어씀 (source='dart'|'edgar').
-- 연도 매핑: rev[0..4]=2020..2024, 단일 비율(npm/roe/…)은 최신연도(2024)에만.
insert into security_financials
  (ticker, fiscal_year, revenue, operating_margin, net_margin, roe, gross_margin,
   debt_ratio, current_ratio, dividend_yield, revenue_growth, unit, source) values
  ('207940', 2020, 1160000000000, 25, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('207940', 2021, 1570000000000, 34.3, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('207940', 2022, 3010000000000, 32.6, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('207940', 2023, 3690000000000, 30.7, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('207940', 2024, 4550000000000, 31.5, 24.5, 11.2, 45, 38, 220, 0, 23.3, 'KRW', 'seed'),
  ('005930', 2020, 236800000000000, 15.2, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005930', 2021, 279600000000000, 18.5, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005930', 2022, 302200000000000, 14.3, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005930', 2023, 258900000000000, 2.5, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005930', 2024, 300900000000000, 10.9, 11.4, 8.6, 37, 28, 248, 2, 16.2, 'KRW', 'seed'),
  ('000660', 2020, 31900000000000, 15.7, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('000660', 2021, 43000000000000, 28.9, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('000660', 2022, 44600000000000, 15.3, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('000660', 2023, 32800000000000, -23.6, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('000660', 2024, 66200000000000, 35.5, 29.9, 27.7, 43, 70, 120, 0.8, 101.8, 'KRW', 'seed'),
  ('AAPL', 2020, 274500000000, 24.1, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AAPL', 2021, 365800000000, 29.8, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AAPL', 2022, 394300000000, 30.3, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AAPL', 2023, 383300000000, 29.8, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AAPL', 2024, 391000000000, 31.5, 24, 164.6, 46, 540, 87, 0.4, 2, 'USD', 'seed'),
  ('NVDA', 2020, 16700000000, 27.2, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('NVDA', 2021, 26900000000, 37.3, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('NVDA', 2022, 27000000000, 20.7, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('NVDA', 2023, 60900000000, 54.1, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('NVDA', 2024, 130500000000, 62.4, 55.8, 91.9, 75, 41, 444, 0.03, 114.2, 'USD', 'seed'),
  ('TSLA', 2020, 31500000000, 6.3, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSLA', 2021, 53800000000, 12.1, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSLA', 2022, 81500000000, 16.8, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSLA', 2023, 96800000000, 9.2, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSLA', 2024, 97700000000, 7.8, 7.3, 20.4, 18, 45, 187, 0, 0.9, 'USD', 'seed'),
  ('035720', 2020, 4200000000000, 12, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035720', 2021, 6100000000000, 9.8, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035720', 2022, 7100000000000, 8.5, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035720', 2023, 7600000000000, 7.2, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035720', 2024, 7900000000000, 6.5, 4, 3.1, 30, 38, 140, 0.2, 3.9, 'KRW', 'seed'),
  ('005380', 2020, 104000000000000, 2.7, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005380', 2021, 117600000000000, 5.7, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005380', 2022, 142200000000000, 6.9, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005380', 2023, 162700000000000, 9.3, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005380', 2024, 175200000000000, 8.1, 7.5, 14.2, 20, 175, 130, 4.6, 7.7, 'KRW', 'seed'),
  ('035420', 2020, 5300000000000, 21, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035420', 2021, 6800000000000, 19.4, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035420', 2022, 8200000000000, 16.9, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035420', 2023, 9700000000000, 14.1, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('035420', 2024, 10700000000000, 14.5, 18, 7.1, 40, 42, 120, 0.5, 10.3, 'KRW', 'seed'),
  ('GOOGL', 2020, 182500000000, 22.6, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('GOOGL', 2021, 257600000000, 30.6, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('GOOGL', 2022, 282800000000, 26.5, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('GOOGL', 2023, 307400000000, 27.4, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('GOOGL', 2024, 350000000000, 32, 27, 30.8, 57, 33, 180, 0.5, 13.9, 'USD', 'seed'),
  ('005490', 2020, 57800000000000, 4.2, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005490', 2021, 76300000000000, 9.2, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005490', 2022, 84800000000000, 7.1, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005490', 2023, 77100000000000, 4.6, null, null, null, null, null, null, null, 'KRW', 'seed'),
  ('005490', 2024, 72700000000000, 4.9, 4.6, 5.8, 14, 78, 175, 3.4, -5.7, 'KRW', 'seed'),
  ('MSFT', 2020, 143000000000, 37, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('MSFT', 2021, 168100000000, 41.6, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('MSFT', 2022, 198300000000, 42.1, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('MSFT', 2023, 211900000000, 41.8, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('MSFT', 2024, 245100000000, 44.6, 36, 38.5, 69, 75, 130, 0.7, 15.7, 'USD', 'seed'),
  ('AMD', 2020, 9760000000, 14, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AMD', 2021, 16400000000, 22.2, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AMD', 2022, 23600000000, 5.4, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AMD', 2023, 22700000000, 1.8, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('AMD', 2024, 25800000000, 8, 6.5, 5.1, 50, 14, 250, 0, 13.7, 'USD', 'seed'),
  ('TSM', 2020, 45500000000, 42.3, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSM', 2021, 56800000000, 40.9, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSM', 2022, 73600000000, 49.5, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSM', 2023, 69300000000, 42.6, null, null, null, null, null, null, null, 'USD', 'seed'),
  ('TSM', 2024, 90000000000, 45.7, 40, 27.8, 54, 28, 230, 1.4, 30, 'USD', 'seed')
on conflict (ticker, fiscal_year) do nothing;

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
