# Security policy

## Reporting a vulnerability

Please report security vulnerabilities privately through a GitHub Security Advisory for this repository. Do not open a public issue or pull request for an undisclosed vulnerability.

Include:

- A clear description of the issue and affected component
- Reproduction steps or a minimal proof of concept
- The potential impact
- Any suggested mitigation

We will acknowledge reports as soon as practical, investigate privately, and coordinate disclosure with the reporter.

## Sensitive data rules

Never commit:

- Gmail app passwords or SMTP credentials
- Firebase service-account files or private keys
- Firebase user tokens or session exports
- Uploaded documents or personally identifying test data

Use local `.env.local` files for development and rotate any credential that may have been exposed.
