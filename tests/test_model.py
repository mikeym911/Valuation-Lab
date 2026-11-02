import json
from pathlib import Path
def test_generated_results():
 d=json.loads((Path(__file__).parents[1]/'docs/model_results.json').read_text()); assert d['validation']['valid_risk_neutral_probability']; assert d['validation']['inside_theoretical_bounds']
