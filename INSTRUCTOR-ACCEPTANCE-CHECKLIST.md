# Instructor Acceptance Checklist

Run one clean repository before release.

- Edit `company_inputs.csv` and confirm the dashboard changes.
- Edit `analyst_targets.csv` and confirm distribution and states change.
- Confirm notebook execution regenerates `docs/model_results.json`.
- Confirm GitHub Actions passes and GitHub Pages publishes.
- Confirm Plotly hover values work at desktop and mobile widths.
- Confirm theoretical checks pass.
- Confirm the maturity-alignment warning appears when the gap exceeds 0.25 year.
- Confirm the notebook rejects bid greater than ask.
- Confirm the notebook rejects rates such as `4.5` and volatility such as `28`.
- Confirm mixed analyst horizons fail with a clear message.
- Confirm negative analyst targets and unsupported option types fail clearly.
