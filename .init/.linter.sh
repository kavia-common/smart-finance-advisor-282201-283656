#!/bin/bash
cd /home/kavia/workspace/code-generation/smart-finance-advisor-282201-283656/finance_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

