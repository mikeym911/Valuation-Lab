# Student Input Guide

Students edit CSV values only. Do not edit the GitHub Actions workflow, dashboard JavaScript, CRR function, or validation assertions.

## `company_inputs.csv`

The file must contain exactly one firm row.

- `spot`: current stock price in dollars per share.
- `strike`: selected option strike in dollars per share.
- `maturity_years`: calendar days to expiration divided by 365.
- `risk_free_rate`: decimal form. Enter 4.5% as `0.045`, not `4.5`.
- `dividend_yield`: annual decimal form. Enter 1.2% as `0.012`.
- `volatility`: annualized decimal form. Enter 28% as `0.28`.
- `volatility_type`: enter `implied` or `historical`. Implied is preferred for the primary lattice when available.
- `option_type`: exactly `call` or `put`.
- `exercise_style`: exactly `european` or `american`.
- `lattice_steps`: use at least `100`; the template uses `200`.
- `market_bid` and `market_ask`: same contract, date, strike, and expiration.
- `dcf_value` and `comps_value`: equity value per diluted share.

## `analyst_targets.csv`

- Enter at least five observations.
- Use one row per analyst report.
- All observations must use the same horizon.
- Do not enter a consensus figure as if it were an individual analyst.
- Do not enter the same report twice.
- Preserve publication date and source name.

## `source_documentation.csv`

Every material input must have a date, source, and method note. A number without a documented source is incomplete.
