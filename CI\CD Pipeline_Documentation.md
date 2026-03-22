This project uses GitHub Actions for Continuous Integration and Vercel for Continuous Deployment.

The pipeline automatically tests, lints, builds, and deploys the application to ensure code quality and reliability.

🔁 Workflow Triggers

The pipeline runs on:
Push to any branch
Pull requests

⚙️ CI Pipeline Steps
Defined in .github/workflows/ci.yml:

Install dependencies
-npm install
-Lint code
-npm run lint
-Run tests (Jest)
-npm run test

Build project
-npm run build

🚀 Deployment (CD)
Handled by Vercel:

Triggered on push to main
Runs install + build
Deploys automatically if successful

🔐 Branch Protection
The main branch is protected:
-Requires pull request
-Requires CI and Vercel checks to pass
-Requires approval before merging

🛠️ Modifying the Pipeline
Edit CI steps: .github/workflows/ci.yml
Add tests: create files in /tests
Change lint rules: edit eslint.config.js
Add env variables: configure in Vercel dashboard
Change Node version: update setup-node in CI file

🧪 Verification
Push commit → CI runs automatically
Break test → CI fails
Merge to main → deployment triggers
Check logs in GitHub Actions tab
📌 Summary

The pipeline ensures:

Automated testing and linting
Reliable builds
Safe, controlled deployments
