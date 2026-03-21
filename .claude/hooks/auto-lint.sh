#!/bin/bash
cd "$CLAUDE_PROJECT_DIR"
npm run format --silent 2>&1
npm run lint --silent 2>&1
