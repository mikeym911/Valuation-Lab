import pandas as pd
from pathlib import Path
p=Path(__file__).parents[1]/'data'
m=pd.read_csv(p/'company_inputs.csv'); a=pd.read_csv(p/'analyst_targets.csv'); s=pd.read_csv(p/'source_documentation.csv')
assert len(m)==1, 'company_inputs.csv must have one row'
assert len(a)>=5 and (a.target>0).all(), 'At least five positive targets are required'
assert a.horizon_months.nunique()==1, 'Targets must share one horizon'
assert float(m.market_bid.iloc[0])<=float(m.market_ask.iloc[0]), 'Bid cannot exceed ask'
assert len(s)>=8, 'Document all material inputs'
print('Input validation passed')
