#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "CHALLENGER 2: ADVERSARIAL STRESS TEST HARNESS (M2/M3)"
echo "Target: MonDossierWeb Apogée Scraper & CAS/MFA Session Engine"
echo "=========================================================="

npx tsx test/challenger-m23-adversarial.ts
