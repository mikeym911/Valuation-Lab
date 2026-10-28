# Valuation-to-Option Pricing Lab v2

This is an integrated analytical build:

- `valuation_option_lab.ipynb` performs the analysis and validation.
- The notebook writes `docs/model_results.json`.
- `docs/index.html` reads the generated JSON and renders the dashboard.
- GitHub Actions executes the notebook before every deployment.
- Deployment fails if the notebook fails or does not produce dashboard data.

## Publish
Upload all contents to the repository root, including `.github/workflows/deploy-pages.yml`. In repository Settings > Pages, select GitHub Actions.
