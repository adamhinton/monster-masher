# Monster Image Generation Build Plan

## Table of Contents

- [Monster Image Generation Build Plan](#monster-imageGeneration-build-plan)
  - [Purpose](#purpose)
  - [Branch Strategy](#branch-strategy)
    - [Branch Rule Summary](#branch-rule-summary)
    - [Branch Names](#branch-names)
    - [When Branching Is Not Worth It](#when-branching-is-not-worth-it)
  - [First Principles](#first-principles)
    - [Architecture Principles](#architecture-principles)
    - [Type Design Principles](#type-design-principles)
    - [Frontend Principles](#frontend-principles)
    - [Backend Principles](#backend-principles)
    - [Testing Principles](#testing-principles)
    - [Production Verification Principles](#production-verification-principles)
    - [Security And Cost Principles](#security-and-cost-principles)
    - [Sentry And Logging Principles](#sentry-and-logging-principles)
  - [Target Architecture](#target-architecture)
    - [High Level Flow](#high-level-flow)
    - [Ownership Boundaries](#ownership-boundaries)
    - [Target Backend Files](#target-backend-files)
    - [Target Frontend Files](#target-frontend-files)
  - [Type And Contract Design Notes](#type-and-contract-design-notes)
    - [Backend DTOs Versus Frontend UI State](#backend-dtos-versus-frontend-ui-state)
    - [Discriminated Unions](#discriminated-unions)
    - [Semantic Naming](#semantic-naming)
    - [Generated Types And Manual Zod Schemas](#generated-types-and-manual-zod-schemas)
    - [Do Not Overdesign The Exact Types In This Plan](#do-not-overdesign-the-exact-types-in-this-plan)
  - [Phase 0 Contract Foundation](#phase-0-contract-foundation)
    - [Step 0 Preflight And Repo Hygiene](#step-0-preflight-and-repo-hygiene)
      - [Step 0a Check Git Status And Working Tree](#step-0a-check-git-status-and-working-tree)
      - [Step 0b Confirm Backend Checks Pass](#step-0b-confirm-backend-checks-pass)
      - [Step 0c Confirm Frontend Passes Lint Typecheck And Tests](#step-0c-confirm-frontend-passes-lint-typecheck-and-tests)
      - [Step 0d Confirm File Structure And Path Assumptions](#step-0d-confirm-file-structure-and-path-assumptions)
      - [Step 0e Note Actual Commands For Later Steps](#step-0e-note-actual-commands-for-later-steps)
    - [Step 1 Decide Final Domain Vocabulary](#step-1-decide-final-domain-vocabulary)
      - [Step 1a Confirm Model Names](#step-1a-confirm-model-names)
      - [Step 1b Confirm Job Status Enum Values](#step-1b-confirm-job-status-enum-values)
      - [Step 1c Confirm Generation Mode Enum Values](#step-1c-confirm-generation-mode-enum-values)
      - [Step 1d Confirm Visibility Enum Values If Needed](#step-1d-confirm-visibility-enum-values-if-needed)
      - [Step 1e Decide Whether Fake Images Create Real MonsterImage Rows](#step-1e-decide-whether-fake-images-create-real-monsterimage-rows)
      - [Step 1f Decide Scope Of MonsterGenerationEvent](#step-1f-decide-scope-of-monstergenerationevent)
    - [Step 2 Add Backend Domain Models And Serializers](#step-2-add-backend-domain-models-and-serializers)
      - [Step 2a Add Or Update Monster Model](#step-2a-add-or-update-monster-model)
      - [Step 2b Add Or Update MonsterImage Model](#step-2b-add-or-update-monsterimage-model)
      - [Step 2c Add Or Update MonsterImageGenerationJob Model](#step-2c-add-or-update-monsterimagegenerationjob-model)
      - [Step 2d Add Monster Serializers](#step-2d-add-monster-serializers)
      - [Step 2e Add MonsterImage Serializer](#step-2e-add-monsterimage-serializer)
      - [Step 2f Add MonsterImageGenerationJob Serializers](#step-2f-add-monsterimagegenerationjob-serializers)
      - [Step 2g Add Serializer-Level OpenAPI Hints Where Needed](#step-2g-add-serializer-level-openapi-hints-where-needed)
      - [Step 2h Create And Inspect Migrations](#step-2h-create-and-inspect-migrations)
      - [Step 2i Run Backend Checks And Existing Tests](#step-2i-run-backend-checks-and-existing-tests)
      - [Step 2j Generate And Inspect Backend OpenAPI Schema If Available](#step-2j-generate-and-inspect-backend-openapi-schema-if-available)
      - [Step 2's Definition Of Done](#step-2-definition-of-done)
        - [Step 2a Add Or Update Monster Model](#step-2a-add-or-update-monster-model)
        - [Step 2b Add MonsterImage Model](#step-2b-add-monsterimage-model)
        - [Step 2c Add MonsterImageGenerationJob Model](#step-2c-add-monitorimagegenerationjob-model)
        - [Step 2d Create And Inspect Migrations](#step-2d-create-and-inspect-migrations)
        - [Step 2e Run Check And Existing Tests](#step-2e-run-check-and-existing-tests)
    - [Step 3 Add Backend Model Constraints And Transition Services](#step-3-add-backend-model-constraints-and-transition-services)
      - [Step 3a Add TextChoices For Status And Mode Fields](#step-3a-add-textchoices-for-status-and-mode-fields)
      - [Step 3b Add Model Level Constraints](#step-3b-add-model-level-constraints)
      - [Step 3c Add generation_jobs.py Service File](#step-3c-add-generation_jobspy-service-file)
      - [Step 3d Implement create_generation_job](#step-3d-implement-create_generation_job)
      - [Step 3e Implement mark_job_running](#step-3e-implement-mark_job_running)
      - [Step 3f Implement mark_job_succeeded](#step-3f-implement-mark_job_succeeded)
      - [Step 3g Implement mark_job_failed And mark_job_blocked](#step-3g-implement-mark_job_failed-and-mark_job_blocked)
    - [Step 4 Add Serializers And OpenAPI Contract Shape](#step-4-add-serializers-and-openapi-contract-shape)
      - NOTE this was combined with step 2, so this step can be ignored now
    - [Step 5 Add Backend API Endpoints For Contract Testing](#step-5-add-backend-api-endpoints-for-contract-testing)
      - [Step 5a Wire Monsters App URLs Into Config](#step-5a-wire-monsters-app-urls-into-config)
      - [Step 5b Add Monster List And Create Views](#step-5b-add-monster-list-and-create-views)
      - [Step 5c Add Monster Detail Update And Delete Views](#step-5c-add-monster-detail-update-and-delete-views)
      - [Step 5d Add Image Generation Job Create And Detail Views](#step-5d-add-imageGeneration-job-create-and-detail-views)
      - [Step 5e Add Notification Toggle Endpoint](#step-5e-add-notification-toggle-endpoint)
      - [Step 5f Add Auth Protection And Ownership Checks](#step-5f-add-auth-protection-and-ownership-checks)
      - [Step 5g Add Trusted Server Transition Endpoint Stubs](#step-5g-add-trusted-server-transition-endpoint-stubs)
    - [Step 6 Add Django Admin Visibility](#step-6-add-django-admin-visibility)
      - [Step 6a Register Monster Admin](#step-6a-register-monster-admin)
      - [Step 6b Register MonsterImage Admin](#step-6b-register-monsterimage-admin)
      - [Step 6c Register MonsterImageGenerationJob Admin](#step-6c-register-monitorimagegenerationjob-admin)
      - [Step 6d Add Admin Helper Methods](#step-6d-add-admin-helper-methods)
      - [Step 6e Manual Admin Smoke Check](#step-6e-manual-admin-smoke-check)
    - [Step 7 Add Admin And Management Command Fake Monster Seeding](#step-7-add-admin-and-management-command-fake-monster-seeding)
      - [Step 7a Create Management Command Directory Structure](#step-7a-create-management-command-directory-structure)
      - [Step 7b Implement seed_fake_monsters Command](#step-7b-implement-seed_fake_monsters-command)
      - [Step 7c Add UserProfileAdmin Seed Action](#step-7c-add-userprofileadmin-seed-action)
      - [Step 7d Add MonsterAdmin Attach Fake Image Action](#step-7d-add-monsteradmin-attach-fake-image-action)
      - [Step 7e Add ENABLE_DEV_ADMIN_ACTIONS Guard](#step-7e-add-enable_dev_admin_actions-guard)
      - [Step 7f Manual Seeding Verification](#step-7f-manual-seeding-verification)
    - [Step 8 Add Backend Tests For Phase 0](#step-8-add-backend-tests-for-phase-0)
      - [Step 8a Add test_models.py](#step-8a-add-test_modelspy)
      - [Step 8b Add test_generation_jobs.py](#step-8b-add-test_generation_jobspy)
      - [Step 8c Add test_serializers.py](#step-8c-add-test_serializerspy)
      - [Step 8d Add test_monster_api.py](#step-8d-add-test_monster_apipy)
      - [Step 8e Add test_admin_actions.py](#step-8e-add-test_admin_actionspy)
      - [Step 8f Add test_seed_fake_monsters.py](#step-8f-add-test_seed_fake_monsterspy)
      - [Step 8g Run Full Backend Suite](#step-8g-run-full-backend-suite)
    - [Step 9 Generate OpenAPI And Frontend Types](#step-9-generate-openapi-and-frontend-types)
      - [Step 9a Generate OpenAPI Schema](#step-9a-generate-openapi-schema)
      - [Step 9b Regenerate Frontend Types](#step-9b-regenerate-frontend-types)
      - [Step 9c Inspect Generated Type Names](#step-9c-inspect-generated-type-names)
      - [Step 9d Commit Generated Artifacts](#step-9d-commit-generated-artifacts)
    - [Step 10 Add Frontend Zod Schemas And Drift Checks](#step-10-add-frontend-zod-schemas-and-drift-checks)
      - [Step 10a Add Monster Zod Schema](#step-10a-add-monster-zod-schema)
      - [Step 10b Add MonsterImage Zod Schema](#step-10b-add-monsterimage-zod-schema)
      - [Step 10c Add MonsterImageGenerationJob Zod Schema](#step-10c-add-monitorimagegenerationjob-zod-schema)
      - [Step 10d Add Compile-Time Drift Checks](#step-10d-add-compile-time-drift-checks)
      - [Step 10e Confirm Frontend Typecheck Still Passes](#step-10e-confirm-frontend-typecheck-still-passes)
    - [Step 11 Phase 0 Local Verification](#step-11-phase-0-local-verification)
    - [Step 12 Phase 0 Merge And Production Verification](#step-12-phase-0-merge-and-production-verification)
  - [Phase 1 Parallel Branch A Frontend Fake UI Flow](#phase-1-parallel-branch-a-frontend-fake-ui-flow)
    - [Step A1 Create Create Page Shell](#step-a1-create-create-page-shell)
      - [Step A1a Create The Route File](#step-a1a-create-the-route-file)
      - [Step A1b Build Responsive Layout Shell](#step-a1b-build-responsive-layout-shell)
      - [Step A1c Add Form And Preview Area Placeholders](#step-a1c-add-form-and-preview-area-placeholders)
      - [Step A1d Add Empty State With Fake Mode Copy](#step-a1d-add-empty-state-with-fake-mode-copy)
    - [Step A2 Build Monster Generation Form](#step-a2-build-monster-generation-form)
      - [Step A2a Define Form Zod Schema](#step-a2a-define-form-zod-schema)
      - [Step A2b Build GenerateMonsterForm Component](#step-a2b-build-generatemonsterform-component)
      - [Step A2c Add All Form Fields](#step-a2c-add-all-form-fields)
      - [Step A2d Add Validation Messages](#step-a2d-add-validation-messages)
    - [Step A3 Build Frontend Generation State Machine](#step-a3-build-frontend-generation-state-machine)
      - [Step A3a Design Generation UI Discriminated Union Types](#step-a3a-design-generation-ui-discriminated-union-types)
      - [Step A3b Add Redux Slice Or Local Reducer](#step-a3b-add-redux-slice-or-local-reducer)
      - [Step A3c Add State Transition Tests](#step-a3c-add-state-transition-tests)
    - [Step A4 Build Generation Progress UI](#step-a4-build-generation-preview-and-progress-ui)
      - [Step A4b Add GenerationProgressCard With Copy](#step-a4b-add-generationprogresscard-with-copy)
      - [Step A4c Add Skeleton Placeholder Visual](#step-a4c-add-skeleton-placeholder-visual)
      - [Step A4d Add Blocked And Error UI Variants](#step-a4d-add-blocked-and-error-ui-variants)
      - [Step A4e Add Retry Button And Submit Guard](#step-a4e-add-retry-button-and-submit-guard)
    - [Step A5 Build Result Actions](#step-a5-build-result-actions)
      - [Step A5a Add Save Action](#step-a5a-add-save-action)
      - [Step A5b Add View Gallery And Regenerate Actions](#step-a5b-add-view-gallery-and-regenerate-actions)
      - [Step A5c Add Sign-In-To-Save Prompt For Logged-Out Users](#step-a5c-add-sign-in-to-save-prompt-for-logged-out-users)
    - [Step A6 Build Gallery And Detail UI Against Fake Data](#step-a6-build-gallery-and-detail-ui-against-fake-data)
      - [Step A6a Build /gallery Page With GalleryGrid](#step-a6a-build-gallery-page-with-gallerygrid)
      - [Step A6b Add Gallery Loading Skeleton And Empty State](#step-a6b-add-gallery-loading-skeleton-and-empty-state)
      - [Step A6c Build MonsterCard Component](#step-a6c-build-monstercard-component)
      - [Step A6d Build /gallery/[monsterId] Detail Shell](#step-a6d-build-gallerymonsterid-detail-shell)
      - [Step A6e Add MonsterImageFrame With Broken Image Fallback](#step-a6e-add-monsterimageframe-with-broken-image-fallback)
    - [Step A7 Add Email When Done UI Copy And Toggle Shell](#step-a7-add-email-when-done-ui-copy-and-toggle-shell)
      - [Step A7a Add should_email_when_done Toggle Auth-Gated](#step-a7a-add-should_email_when_done-toggle-auth-gated)
      - [Step A7b Wire Conservative Keep-Tab-Open Copy](#step-a7b-wire-conservative-keep-tab-open-copy)
      - [Step A7c Guard Anonymous Users From Arbitrary Email Input](#step-a7c-guard-anonymous-users-from-arbitrary-email-input)
    - [Step A8 Add Frontend Automated Tests](#step-a8-add-frontend-automated-tests)
      - [Step A8a Form Validation Tests](#step-a8a-form-validation-tests)
      - [Step A8b State Machine Transition Tests](#step-a8b-state-machine-transition-tests)
      - [Step A8c Create Page Happy Path And Error/Blocked Tests](#step-a8c-create-page-happy-path-and-errorblocked-tests)
      - [Step A8d Gallery Render And Empty State Tests](#step-a8d-gallery-render-and-empty-state-tests)
      - [Step A8e Email Toggle Visibility Test](#step-a8e-email-toggle-visibility-test)
    - [Step A9 Branch A Local Verification](#step-a9-branch-a-local-verification)
    - [Step A10 Branch A Merge And Production Verification](#step-a10-branch-a-merge-and-production-verification)
  - [Phase 2 Parallel Branch B Server Pipeline](#phase-2-parallel-branch-b-server-pipeline)
    - [Step B1 Add Server Environment Validation](#step-b1-add-server-environment-validation)
      - [Step B1a Add Generation Mode Env Var And Validation](#step-b1a-add-generation-mode-env-var-and-validation)
      - [Step B1b Add Provider Key Validation Real Mode Only](#step-b1b-add-provider-key-validation-real-mode-only)
      - [Step B1c Add Storage Bucket Env Validation](#step-b1c-add-storage-bucket-env-validation)
      - [Step B1d Add Server-Side Size And Quality Constants](#step-b1d-add-server-side-size-and-quality-constants)
    - [Step B2 Add Provider Abstractions](#step-b2-add-provider-abstractions)
      - [Step B2a Define ImageProvider Interface](#step-b2a-define-imageprovider-interface)
      - [Step B2b Implement FakeImageProvider](#step-b2b-implement-fakeimageprovider)
      - [Step B2c Add VercelAIGatewayImageProvider Shell](#step-b2c-add-VercelAIGatewayImageProvider-shell)
      - [Step B2d Normalize Provider Output And Errors](#step-b2d-normalize-provider-output-and-errors)
    - [Step B3 Add Moderation Abstraction](#step-b3-add-moderation-abstraction)
      - [Step B3a Define ModerationProvider Interface](#step-b3a-define-moderationprovider-interface)
      - [Step B3b Implement FakeModerationProvider](#step-b3b-implement-fakemoderationprovider)
      - [Step B3c Add Local Banned-Term Guard](#step-b3c-add-local-banned-term-guard)
      - [Step B3d Add Real Moderation Shell For Phase 4](#step-b3d-add-real-moderation-shell-for-phase-4)
      - [Step B3e Ensure Blocked Result Short-Circuits Image Generation](#step-b3e-ensure-blocked-result-short-circuits-imageGeneration)
    - [Step B4 Add Supabase Storage Abstraction](#step-b4-add-supabase-storage-abstraction)
      - [Step B4a Define ImageStorage Interface](#step-b4a-define-imagestorage-interface)
      - [Step B4b Implement FakeImageStorage](#step-b4b-implement-fakeimagestorage)
      - [Step B4c Build Storage Path Helper](#step-b4c-build-storage-path-helper)
      - [Step B4d Add Supabase Server-Side Storage Implementation](#step-b4d-add-supabase-server-side-storage-implementation)
      - [Step B4e Validate MIME Type And Extension](#step-b4e-validate-mime-type-and-extension)
    - [Step B5 Add Next Server Route For Generation](#step-b5-add-next-server-route-for-generation)
      - [Step B5a Create POST /api/monsters/[monsterID]/generate-image Route File](#step-b5a-create-post-apigenerate-monster-route-file)
      - [Step B5b Add Zod Request Schema And Validation](#step-b5b-add-zod-request-schema-and-validation)
      - [Step B5c Extract And Verify User Session Server-Side](#step-b5c-extract-and-verify-user-session-server-side)
      - [Step B5d Wire Full Orchestration Flow](#step-b5d-wire-full-orchestration-flow)
      - [Step B5e Add Normalized Error Response Shapes](#step-b5e-add-normalized-error-response-shapes)
      - [Step B5f Add Sanitized Sentry Captures](#step-b5f-add-sanitized-sentry-captures)
    - [Step B6 Add Django Job Update Endpoints For Trusted Server Flow](#step-b6-add-django-job-update-endpoints-for-trusted-server-flow)
      - [Step B6a Document And Decide Trust Boundary Approach](#step-b6a-document-and-decide-trust-boundary-approach)
      - [Step B6b Add Or Refine Job Transition Endpoints](#step-b6b-add-or-refine-job-transition-endpoints)
      - [Step B6c Add Auth And Server Secret Checks](#step-b6c-add-auth-and-server-secret-checks)
      - [Step B6d Add Tests For Unauthorized Transition Attempts](#step-b6d-add-tests-for-unauthorized-transition-attempts)
    - [Step B7 Add Server Pipeline Tests](#step-b7-add-server-pipeline-tests)
      - [Step B7a Route Request Validation Tests](#step-b7a-route-request-validation-tests)
      - [Step B7b Fake Happy Path End-To-End Test](#step-b7b-fake-happy-path-end-to-end-test)
      - [Step B7c Moderation Blocked And Provider Failure Tests](#step-b7c-moderation-blocked-and-provider-failure-tests)
      - [Step B7d Storage And Django Client Failure Tests](#step-b7d-storage-and-django-client-failure-tests)
    - [Step B8 Branch B Local Verification](#step-b8-branch-b-local-verification)
    - [Step B9 Branch B Merge And Production Verification](#step-b9-branch-b-merge-and-production-verification)
  - [Phase 3 Integration In Fake Mode](#phase-3-integration-in-fake-mode)
    - [Step 13 Connect UI To Server Pipeline](#step-13-connect-ui-to-server-pipeline)
      - [Step 13a Replace Fake Handler With Real Route Call](#step-13a-replace-fake-handler-with-real-route-call)
      - [Step 13b Parse Response With Zod And Map To UI State](#step-13b-parse-response-with-zod-and-map-to-ui-state)
      - [Step 13c Add Duplicate Submit Guard](#step-13c-add-duplicate-submit-guard)
    - [Step 14 Connect Gallery And Detail Pages To Django](#step-14-connect-gallery-and-detail-pages-to-django)
      - [Step 14a Wire Gallery Page To Django Monster List Endpoint](#step-14a-wire-gallery-page-to-django-monster-list-endpoint)
      - [Step 14b Wire Detail Page To Django Monster Detail Endpoint](#step-14b-wire-detail-page-to-django-monster-detail-endpoint)
      - [Step 14c Handle Loading Empty And Error States With Real Data](#step-14c-handle-loading-empty-and-error-states-with-real-data)
    - [Step 15 Add Full Fake Lifecycle Test](#step-15-add-full-fake-lifecycle-test)
      - [Step 15a Write Backend Full Lifecycle Integration Test](#step-15a-write-backend-full-lifecycle-integration-test)
      - [Step 15b Write Frontend Route Full Lifecycle Test](#step-15b-write-frontend-route-full-lifecycle-test)
      - [Step 15c Add Blocked And Failed Lifecycle Tests](#step-15c-add-blocked-and-failed-lifecycle-tests)
    - [Step 16 Integration Local Verification](#step-16-integration-local-verification)
    - [Step 17 Integration Merge And Production Verification](#step-17-integration-merge-and-production-verification)
  - [Phase 4 Real Image Generation](#phase-4-real-imageGeneration)
    - [Step 18 Add Real Provider Implementation](#step-18-add-real-provider-implementation)
      - [Step 18a Install Provider SDK If Needed](#step-18a-install-provider-sdk-if-needed)
      - [Step 18b Implement VercelAIGatewayImageProvider Behind Interface](#step-18b-implement-VercelAIGatewayImageProvider-behind-interface)
      - [Step 18c Add Timeout And Abort Behavior](#step-18c-add-timeout-and-abort-behavior)
      - [Step 18d Normalize OpenAI Errors Into Typed Provider Results](#step-18d-normalize-openai-errors-into-typed-provider-results)
    - [Step 19 Add Real Moderation Implementation](#step-19-add-real-moderation-implementation)
      - [Step 19a Implement Real OpenAI Moderation Call](#step-19a-implement-real-openai-moderation-call)
      - [Step 19b Integrate Into Route Before Image Generation](#step-19b-integrate-into-route-before-imageGeneration)
      - [Step 19c Normalize Blocked Response Into ModerationResult](#step-19c-normalize-blocked-response-into-moderationresult)
    - [Step 20 Add Cost And Abuse Guards](#step-20-add-cost-and-abuse-guards)
      - [Step 20a Add Per-User Generation Limit In Django](#step-20a-add-per-user-generation-limit-in-django)
      - [Step 20b Enforce Auth Requirement For Real Generation](#step-20b-enforce-auth-requirement-for-real-generation)
      - [Step 20c Add Server-Side Model Quality And Size Allowlist](#step-20c-add-server-side-model-quality-and-size-allowlist)
      - [Step 20d Add Structured Sentry Event For Limit Hits](#step-20d-add-structured-sentry-event-for-limit-hits)
    - [Step 21 Add Real Storage Upload Path](#step-21-add-real-storage-upload-path)
      - [Step 21a Confirm Supabase Bucket Exists And Is Public](#step-21a-confirm-supabase-bucket-exists-and-is-public)
      - [Step 21b Wire Image Bytes Upload From Server Route](#step-21b-wire-image-bytes-upload-from-server-route)
      - [Step 21c Save Public URL And Storage Path In Django](#step-21c-save-public-url-and-storage-path-in-django)
      - [Step 21d Document Orphan Cleanup Procedure](#step-21d-document-orphan-cleanup-procedure)
    - [Step 22 Real Image Generation Local Verification](#step-22-real-imageGeneration-local-verification)
    - [Step 23 Real Image Generation Merge And Production Verification](#step-23-real-imageGeneration-merge-and-production-verification)
  - [Phase 5 Durable Jobs And Email Notifications](#phase-5-durable-jobs-and-email-notifications)
    - [Step 24 Design Durable Execution Before Implementation](#step-24-design-durable-execution-before-implementation)
      - [Step 24a Evaluate Execution Mechanism Options](#step-24a-evaluate-execution-mechanism-options)
      - [Step 24b Document Idempotency And Retry Strategy](#step-24b-document-idempotency-and-retry-strategy)
      - [Step 24c Document Email Trigger And Deduplication Behavior](#step-24c-document-email-trigger-and-deduplication-behavior)
      - [Step 24d Write Decision Before Any Implementation Begins](#step-24d-write-decision-before-any-implementation-begins)
    - [Step 25 Implement Email When Done Only After Durability Exists](#step-25-implement-email-when-done-only-after-durability-exists)
      - [Step 25a Add Email Send Service Mocked In Tests](#step-25a-add-email-send-service-mocked-in-tests)
      - [Step 25b Set notified_at And Store Send Errors](#step-25b-set-notified_at-and-store-send-errors)
      - [Step 25c Guard Against Duplicate Sends On Retry](#step-25c-guard-against-duplicate-sends-on-retry)
      - [Step 25d Update UI Copy To Reflect Page-Leave Safety](#step-25d-update-ui-copy-to-reflect-page-leave-safety)
    - [Step 26 Durable Job Tests And Verification](#step-26-durable-job-tests-and-verification)
      - [Step 26a Add Retry Idempotency Tests](#step-26a-add-retry-idempotency-tests)
      - [Step 26b Add Duplicate Monster And Image Prevention Tests](#step-26b-add-duplicate-monster-and-image-prevention-tests)
      - [Step 26c Add Email Deduplication Tests](#step-26c-add-email-deduplication-tests)
      - [Step 26d Manual Production Durable Smoke Check](#step-26d-manual-production-durable-smoke-check)
  - [Phase 6 Polish Hardening And Cleanup](#phase-6-polish-hardening-and-cleanup)
    - [Step 27 Admin Hardening](#step-27-admin-hardening)
      - [Step 27a Improve List Displays Filters And Search](#step-27a-improve-list-displays-filters-and-search)
      - [Step 27b Add Image URL Preview Helper](#step-27b-add-image-url-preview-helper)
      - [Step 27c Add Mark Primary Image Action](#step-27c-add-mark-primary-image-action)
      - [Step 27d Add Hide Or Remove Image Metadata Action](#step-27d-add-hide-or-remove-image-metadata-action)
    - [Step 28 Storage Cleanup Behavior](#step-28-storage-cleanup-behavior)
      - [Step 28a Decide And Document Delete Behavior](#step-28a-decide-and-document-delete-behavior)
      - [Step 28b Add Storage Cleanup Service](#step-28b-add-storage-cleanup-service)
      - [Step 28c Wire Cleanup To Monster Delete](#step-28c-wire-cleanup-to-monster-delete)
      - [Step 28d Add Cleanup Tests Success And Failure Paths](#step-28d-add-cleanup-tests-success-and-failure-paths)
    - [Step 29 Sentry Review](#step-29-sentry-review)
      - [Step 29a Audit Backend And Frontend Captures For Sensitive Data](#step-29a-audit-backend-and-frontend-captures-for-sensitive-data)
      - [Step 29b Add Structured Tags To Useful Events](#step-29b-add-structured-tags-to-useful-events)
      - [Step 29c Remove Noisy Expected-Error Captures](#step-29c-remove-noisy-expected-error-captures)
    - [Step 30 Final Production QA](#step-30-final-production-qa)
      - [Step 30a Run Full Command Suite Backend And Frontend](#step-30a-run-full-command-suite-backend-and-frontend)
      - [Step 30b Manual Production Walkthrough Checklist](#step-30b-manual-production-walkthrough-checklist)
  - [Definition Of Done](#definition-of-done)
  - [Known Design Questions To Revisit](#known-design-questions-to-revisit)

---

## Purpose

Build Monster Masher's monster image generation feature in a production-shaped way without letting the project explode.

This plan intentionally restates project rules because coding agents may not read the other instruction files.

Core goal:

```txt
Users can create cute original monsters, generate an image save the monster, view it in a gallery, inspect it in Django admin, and eventually run real image generation safely.
```

Non-goal:

```txt
Do not build a game platform.
Do not add battles, evolution, trading, social feeds, Stripe, or complex moderation queues.
Do not call paid image generation APIs in automated tests.
```

---

## Branch Strategy

### Branch Rule Summary

Use one branch for Phase 0.

Do **not** split into parallel agents until the backend models, serializers, OpenAPI types, frontend Zod schemas, and fake lifecycle are stable.

The contract must exist before two agents build against it.

### Branch Names

Use these branch names unless there is already a naming convention in the repo:

```txt
image-gen-contract-foundation
image-gen-ui-flow
image-gen-server-pipeline
image-gen-integration-fake-mode
image-gen-real-provider
image-gen-durable-jobs
image-gen-polish-hardening
```

### When Branching Is Not Worth It

Do not branch just to feel productive.

Branching is worth it only when:

- the two branches touch mostly different files
- both branches are testable independently
- both branches build against an already-merged contract
- neither branch has to invent missing API shapes
- merge conflicts are expected to be minor

Branching is not worth it when:

- both agents need to edit the same serializers, generated types, Zod schemas, or route contracts
- one agent has to guess what the other will build
- a branch cannot be tested until another branch lands

---

## First Principles

### Architecture Principles

Monster Masher keeps ownership boundaries boring and explicit.

- Django owns saved app data, Django ORM models, permissions, admin visibility, migrations, and OpenAPI schema.
- Next owns public UX, auth UI, image generation server routes, provider calls, and frontend polish.
- Supabase Auth owns identity/session.
- Supabase Storage owns public image files.
- Frontend never writes app-owned monster records directly to Supabase Postgres.
- Client Components never call paid providers or use provider keys.
- Client Components never hold service role keys, image provider keys, access tokens, or full sessions.

Primary data flow:

```txt
Client Component
  -> Next server route
  -> provider/fake provider
  -> Supabase Storage from server-side code
  -> Django API
  -> Django ORM
  -> OpenAPI generated contract
  -> frontend Zod validation
```

### Type Design Principles

Types should only model valid states.

This is not optional.

Use discriminated unions for state machines:

- auth state
- generation UI state
- image generation job API response state
- route response state where practical
- provider result state
- moderation result state

Avoid scattered booleans:

```txt
is_loading
is_error
is_success
has_image
has_error
```

These allow impossible combinations.

Prefer semantic names:

```txt
num_monsters, not monsters
is_valid, not valid
has_image, not image_exists if the meaning is boolean
monster_image_url, not url if several URLs exist
generation_job_id, not id if multiple IDs exist
safe_error_message, not error if it is user-facing
raw_response, not data before validation
parsed_response, not data after validation
```

Backend Python cannot be as strict as TypeScript, but it should still use:

- `TextChoices`
- model constraints
- serializer validation
- service-layer transition functions
- explicit test coverage for impossible states

### Frontend Principles

Frontend code should be polished and strongly typed.

- Use ShadCN primitives first.
- Use Tailwind for layout and visual composition, not to hand-roll inaccessible primitives.
- Use Zod at boundaries.
- Treat `response.json()` as `unknown`.
- Use generated OpenAPI types as the backend contract.
- Hand-write Zod schemas and compile-time drift checks.
- Do not manually edit generated files.
- Do not use `any` or `as any`.
- Do not store backend collections in Redux unless there is a clear UI reason.
- Use Redux for UI flow state, not as the canonical backend data cache.

### Backend Principles

Backend code should be boring and enforce ownership.

- Use Django ORM and migrations for all Django-owned tables.
- Do not manually create or alter Django-owned tables in Supabase dashboard.
- Never accept `owner_id`, `user_id`, or `supabase_user_id` from the client as authority.
- User identity comes from verified Supabase JWTs.
- Use object-level permissions.
- Keep model logic modest.
- Put orchestration in service functions where views would otherwise get fat.
- Register useful admin views early.
- Add tests before the feature becomes too large to reason about.

### Testing Principles

Automated tests must never hit:

- real image providers
- real OpenAI moderation
- real paid AI APIs
- real email sending
- real external storage unless specifically writing a manual integration check

Use fakes/mocks:

```txt
FakeImageProvider
FakeModerationProvider
FakeImageStorage
FakeEmailSender
FakeDjangoClient where needed
```

Test the logic and lifecycle, not the vendor.

### Production Verification Principles

Merging halfway through a phase is allowed and encouraged.

The project is not published yet. Production checks are used to catch environment drift early.

Each merge checkpoint should verify:

- Render deploy succeeds.
- Vercel deploy succeeds.
- `/health` still works.
- schema/docs routes still work if affected.
- prod frontend can still call prod backend.
- admin still loads if backend touched models/admin.
- fake mode does not accidentally make paid calls.
- no obvious Sentry spam appears.
- no secrets are exposed in logs.

### Security And Cost Principles

- Real image generation is server-only.
- Default local/test mode is fake.
- Anonymous real generation is not enabled unless deliberately designed with rate limits.
- Provider keys are server-only.
- Supabase service role keys are server-only.
- Public generated monster images are okay for this app.
- Uploaded reference images, if added later, should be private by default.
- Do not log raw prompts by default.
- Do not log provider responses containing image data or base64.

### Sentry And Logging Principles

Capture unexpected failures and useful lifecycle events.

Do capture:

- generation job failed
- provider failed
- storage upload failed
- job state transition failed
- schema validation drift
- impossible UI state
- unexpected 500s

Do not capture:

- every button click
- every validation typo
- every successful request
- `/health` pings
- raw prompts
- access tokens
- cookies
- provider keys
- raw base64 image data

---

## Target Architecture

### High Level Flow

Initial fake/sync flow:

```txt
User submits form
  -> frontend validates draft
  -> Next route validates request
  -> Django creates job
  -> fake provider returns fixture image metadata
  -> Django creates Monster + MonsterImage
  -> Django marks job succeeded
  -> frontend receives generated/saved monster
```

Real/sync flow:

```txt
User submits form
  -> frontend validates draft
  -> Next route validates request
  -> Django creates job
  -> moderation checks prompt
  -> provider generates image
  -> Next uploads image to Supabase Storage
  -> Django creates Monster + MonsterImage
  -> Django marks job succeeded
  -> frontend receives generated/saved monster
```

Durable future flow:

```txt
User submits form
  -> Next starts durable workflow / queue job
  -> Django records queued job
  -> frontend polls job endpoint
  -> user may leave page
  -> workflow finishes
  -> Django job updates
  -> optional email notification sends
```

Do not promise durable behavior before the durable flow exists.

### Ownership Boundaries

Django owns:

- `Monster`
- `MonsterImage`
- `MonsterImageGenerationJob`
- job status
- saved image metadata
- ownership
- permissions
- admin actions
- OpenAPI schema

Next owns:

- provider abstraction
- real/fake image provider implementation
- moderation wrapper
- storage upload helper
- frontend route handlers
- UI flow
- client-side validation and display

Supabase owns:

- identity
- public monster image file storage
- Postgres database backing Django ORM

### Target Backend Files

Expected shape:

```txt
backend/
  apps/
    monsters/
      models.py
      serializers.py
      views.py
      urls.py
      admin.py
      services/
        generation_jobs.py
        fake_monsters.py
        prompts.py
        storage_paths.py
      management/
        commands/
          seed_fake_monsters.py
      tests/
        test_models.py
        test_serializers.py
        test_generation_jobs.py
        test_monster_api.py
        test_admin_actions.py
        test_seed_fake_monsters.py
```

Adjust to match current repo structure.

### Target Frontend Files

Expected shape:

```txt
frontend/
  src/
    app/
      create/
        page.tsx
      gallery/
        page.tsx
        [monsterId]/
          page.tsx
      api/
        generate-monster/
          route.ts
    components/
      create/
        GenerateMonsterForm.tsx
        GenerationProgressCard.tsx
        GenerationResultActions.tsx
      gallery/
        GalleryGrid.tsx
        EmptyGalleryState.tsx
      monsters/
        MonsterCard.tsx
        MonsterImageFrame.tsx
    lib/
      api/
        schemas/
          Monster.ts
          MonsterImage.ts
          MonsterImageGenerationJob.ts
        __generated__/
          types.ts
      imageGeneration/
        providers.ts
        fakeProvider.ts
        openAI_Provider.ts
        moderation.ts
        storage.ts
        routeSchemas.ts
      django/
        server.ts
```

Adjust to match current import aliases.

---

## Type And Contract Design Notes

### Backend DTOs Versus Frontend UI State

The backend will generate types like:

```txt
Monster
MonsterImage
MonsterImageGenerationJob
```

That is good and necessary, but it is not enough for ideal frontend UI state.

Annoying but correct fact:

```txt
The generated backend DTO type describes server data.
The frontend still needs hand-written UI state types for loading, editing, submitting, failed, blocked, succeeded, saved, etc.
```

That is worth the extra work.

Do not shove UI state into backend DTOs.

Do not weaken backend DTOs to make frontend UI easier.

### Discriminated Unions

Use discriminated unions for frontend UI state and, where practical, API response wrappers.

Broad target categories:

```txt
Generation form state:
  idle/editing/submitting

Generation job state:
  queued/running/succeeded/failed/blocked

Provider result:
  success/blocked/failed

Storage result:
  success/failed

Save result:
  unsaved/saving/saved/failed

Gallery state:
  loading/loaded/empty/error
```

Do not design the exact final union shapes in this document.

The exact types should be hand-written carefully during implementation.

### Semantic Naming

Use names that explain the kind of value.

Examples:

```txt
num_fake_monsters
selected_monster_id
generation_job_id
is_generation_enabled
has_primary_image
safe_error_message
raw_provider_response
parsed_job_response
public_image_url
image_storage_path
should_email_when_done
```

Avoid vague names:

```txt
data
result
valid
url
id
thing
stuff
response2
```

A short name is okay inside a tiny scope. At module boundaries, be specific.

### Generated Types And Manual Zod Schemas

Pattern:

```txt
Django serializer/OpenAPI schema
  -> generated TypeScript type
  -> hand-written Zod schema
  -> compile-time drift check
```

Rules:

- Do not manually edit generated files.
- Do not cast API responses into generated types.
- Parse API responses with Zod.
- Let TypeScript fail when backend and Zod drift apart.
- Use `unknown` at data boundaries.
- Keep handwritten UI state types separate from generated backend DTOs.

### Do Not Overdesign The Exact Types In This Plan

This document intentionally does not define final discriminated unions.

During implementation, stop and design the exact types carefully before writing reducers/components.

This plan defines the boundaries and principles only.

---

## Phase 0 Contract Foundation

### Step 0 Preflight And Repo Hygiene

branch: image-gen-contract-foundation

Purpose:

Confirm the current repo state before adding image generation models.

#### Step 0a Check Git Status And Working Tree

- [x] Run `git status` in both `backend/` and `frontend/`.
- [x] Confirm no uncommitted migrations, generated files, or in-progress work.
- [x] Stash or commit anything pending before starting.

#### Step 0b Confirm Backend Checks Pass

- [x] Run `python manage.py check`.
- [x] Run `python manage.py test`.
- [x] Confirm auth flow works locally (login, token refresh, protected endpoint).
- [x] Confirm `/health` endpoint returns 200.

#### Step 0c Confirm Frontend Passes Lint Typecheck And Tests

- [x] Run `npm run lint`.
- [x] Run `npx tsc --noEmit`.
- [x] Run the test suite with `--run` or equivalent.
- [x] Confirm the frontend-to-Django smoke test page still works.

#### Step 0d Confirm File Structure And Path Assumptions

- [x] Confirm frontend source root (`frontend/src/` vs root-level `app/`).
- [x] Confirm generated OpenAPI output path (e.g. `backend/openapi.yaml`).
- [x] Confirm generated frontend types path (e.g. `frontend/src/lib/api/__generated__/types.ts`).
- [x] Confirm import alias convention (`@/`, `~/`, etc.).

#### Step 0e Note Actual Commands For Later Steps

- [x] Write down the exact backend test command.
- [x] Write down the exact frontend test command.
- [x] Write down the exact frontend lint command.
- [x] Write down the exact frontend typecheck command.
- [x] Write down the exact OpenAPI generation command.
- [x] Write down the exact frontend type generation command.

Suggested commands:

```bash
git status

cd backend
python manage.py check
python manage.py test

cd ../frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

If `npm test -- --run` does not exist yet, note the actual test command or add test setup later in the relevant frontend testing step.

Verification:

- [xx] Backend checks pass.
- [xx] Frontend lint passes.
- [xx] Frontend typecheck passes.
- [xx] Existing tests pass.
- [xx] No file structure assumptions are wrong.

### Step 1 Decide Final Domain Vocabulary

branch: image-gen-contract-foundation

Purpose:

Lock names before migrations/types exist.

#### Step 1a Confirm Model Names

- [x] Confirm `Monster` as the saved creature model name.
- [x] Confirm `MonsterImage` as the stored image model name.
- [x] Confirm `MonsterImageGenerationJob` as the lifecycle model name.
- [x] Check whether a `Monster` model already exists in the repo and note its current shape.

#### Step 1b Confirm Job Status Enum Values

- [x] Confirm `queued`, `running`, `succeeded`, `failed`, `blocked` as the full set.
- [x] Decide whether `canceled` is deferred (recommended: yes, defer until cancellation exists).
- [x] Note any additional states that feel necessary and either add them or explicitly defer them.

#### Step 1c Confirm Generation Mode Enum Values

- [x] Confirm `fake` and `real` as the generation mode values.
- [x] Confirm that `fake` is the default for local/test and that `real` requires a server env var.

#### Step 1d Confirm Visibility Enum Values If Needed

- DECISION: No it doesn't need this field
- [x] Decide whether `Monster` needs a visibility field now (`public`, `private`) or whether it can be added later.
- [x] If deferred, note the decision explicitly so frontend and admin code does not assume visibility.

#### Step 1e Decide Whether Fake Images Create Real MonsterImage Rows

- [x] Decide: does fake generation create a real `MonsterImage` row with a fixture URL, or is the job result ephemeral?
- [x] Recommendation: create a real `MonsterImage` row so the full lifecycle and admin visibility are testable.
- [x] Note this decision explicitly — it affects seeding, tests, and admin.
- DECISION: Yes, fake generation creates real `MonsterImage` rows with fixture URLs.

#### Step 1f Decide Scope Of MonsterGenerationEvent

- [x] Decide whether `MonsterGenerationEvent` (analytics) is in scope for this plan.
- [x] Recommendation: defer entirely. The job model captures enough lifecycle data for now.
- [x] Record the decision so future agents do not invent an overlapping concept.
- DECISION: Defer entirely.

Recommended names: DECISION: Yes we'll go with the below.

```txt
Monster
MonsterImage
MonsterImageGenerationJob
```

Recommended job statuses:

```txt
queued
running
succeeded
failed
blocked
```

Recommended generation modes:

```txt
fake
real
```

Recommendation:

Do not add `canceled` until cancellation actually exists.

Verification:

- [] Names are written down before migration files are created.
- [] No conflicting model names exist.
- [] No duplicate "event" and "job" concepts overlap.
- [] Future frontend agents can tell which type to import.

### Step 2 Add Backend Domain Models And Serializers

NOTE: This was combined with the original step 4.

branch: image-gen-contract-foundation

Purpose:

Add the core Django domain models and DRF serializers for saved monsters, stored monster images, and monster image generation jobs.

This step is intentionally limited to:

- Django model definitions
- DRF serializer definitions
- migrations
- local backend checks
- backend OpenAPI schema inspection where possible

#### Step 2a Add Or Update Monster Model

branch: image-gen-contract-foundation

Purpose:

Create the canonical saved monster metadata model. `Monster` represents the user-facing creature record. It does not store image data, image URLs, provider metadata, generation lifecycle state, or frontend UI state.

Model guidance:

```txt
Monster:
  saved creature metadata

MonsterImage:
  stored generated image asset

MonsterImageGenerationJob:
  lifecycle of one image generation attempt
```

Tasks:

- [] Check whether a `Monster` model already exists; if so, extend rather than replace.
- [] Add UUID primary key.
- [] Add `owner` FK to `UserProfile` with a clear `related_name`, such as `monsters`.
- [] Ensure `owner` is always set from the verified authenticated user in later API code.
- [] Do not accept `owner`, `owner_id`, `user`, `user_id`, or `supabase_user_id` from client input.
- [] Add required `display_name` field.
  - This is the monster's user-facing name or name inspiration.
  - Do not add both `name` and `display_name` unless there is a real separate internal-name use case.
  - Suggested max length: `80`.
- [] Add required free-text `element` field.
  - Max length: `20`.
  - Do not use enum choices.
  - Frontend may offer suggestions, but backend must allow custom user text.
- [] Add required `habitat` field.
  - Suggested max length: `60`.
- [] Add required `personality` field.
  - Suggested max length: `60`.
- [] Add required `color_palette` field.
  - Suggested max length: `80`.
- [] Add optional `flavor_text` field.
  - Use `TextField(blank=True)` on the model.
  - Enforce practical max length in serializer validation, likely `500` characters.
- [] Add `created_at` and `updated_at`.
- [] Do not add a visibility field in this phase.
  - Add a model comment/docstring note that visibility was intentionally deferred.
- [] Do not store image data on `Monster`.
  - No image bytes.
  - No base64.
  - No public image URL.
  - No storage path.
  - Those belong on `MonsterImage`.
- [] Do not store generation lifecycle data on `Monster`.
  - No status.
  - No provider.
  - No prompt.
  - No error code.
  - Those belong on `MonsterImageGenerationJob`.
- [] Use normal model columns for monster traits instead of JSON.
  - This keeps admin, filtering, serializers, and schema output clear.
- [] Add boring, useful indexes.
  - Owner + created date.
  - Owner + display name if useful.
  - Owner + element if useful.
- [] Add default ordering, likely newest first.

Suggested shape:

```py
class Monster(models.Model):
    """
    Saved monster metadata owned by one app user.

    Images live on MonsterImage.
    Generation lifecycle lives on MonsterImageGenerationJob.
    Visibility is intentionally deferred for now.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="monsters",
    )

    display_name = models.CharField(max_length=80)
    element = models.CharField(max_length=20)
    habitat = models.CharField(max_length=60)
    personality = models.CharField(max_length=60)
    color_palette = models.CharField(max_length=80)
    flavor_text = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "monster"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["owner", "display_name"]),
            models.Index(fields=["owner", "element"]),
        ]

    def __str__(self) -> str:
        return self.display_name
```

Verification for this sub-step:

- [] `Monster` has no image bytes/base64 fields.
- [] `Monster` has no image URL/storage path fields.
- [] `Monster` has no provider/status/error fields.
- [] `element` is free text with max length `20`, not an enum.
- [] `owner` is present but not planned as writable client input.
- [] field names are semantic and boring.

---

#### Step 2b Add Or Update MonsterImage Model

branch: image-gen-contract-foundation

Purpose:

Create the stored image asset model. `MonsterImage` represents an image that exists, or will exist, in object storage. It stores storage metadata, not image bytes.

Tasks:

- [] Check whether `MonsterImage` already exists; if so, extend rather than replace.
- [] Add UUID primary key.
- [] Add FK to `Monster`.
  - Prefer `on_delete=models.CASCADE` unless there is a strong reason to preserve orphaned image metadata.
  - Use a clear `related_name`, such as `images`.
- [] Add `public_image_url`.
  - Nullable/blank until upload succeeds.
  - This is the public URL used by the frontend to display the image.
- [] Add `image_storage_path`.
  - This is the storage object path used for cleanup/deletion later.
  - Do not expose it publicly unless intentionally chosen in the serializer.
- [] Add safe provider metadata:
  - `provider`
  - `provider_model`
- [] Add `created_at`.
- [] Do not add `is_primary` in this phase.
- [] Do not add image visibility in this phase.
- [] Do not store image bytes.
- [] Do not store base64.
- [] Do not store raw provider response.

Suggested shape:

```py
class MonsterImage(models.Model):
    """
    Stored image metadata for a generated monster image.

    Image bytes live in object storage, not Postgres.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    monster = models.ForeignKey(
        Monster,
        on_delete=models.CASCADE,
        related_name="images",
    )

    public_image_url = models.URLField(blank=True, null=True)
    image_storage_path = models.TextField(blank=True)

    provider = models.CharField(max_length=50)
    provider_model = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "monster_image"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["monster", "-created_at"]),
            models.Index(fields=["provider", "provider_model"]),
        ]

    def __str__(self) -> str:
        return f"Image for {self.monster_id}"
```

Verification for this sub-step:

- [] `MonsterImage` has no binary/base64 image fields.
- [] `public_image_url` can be empty until upload succeeds.
- [] `image_storage_path` exists for future cleanup.
- [] provider fields are safe labels, not raw provider response blobs.
- [] `is_primary` is not added.
- [] image visibility is not added.

---

#### Step 2c Add Or Update MonsterImageGenerationJob Model

branch: image-gen-contract-foundation

Purpose:

Create the durable lifecycle record for one image generation attempt. This model tracks ownership, status, generation mode, sanitized prompt/provider metadata, notification state, failure state, and timing.

It does not duplicate monster trait fields and does not store raw prompts or raw provider responses.

Design rules:

```txt
Monster:
  user-facing monster metadata

MonsterImage:
  stored image asset metadata

MonsterImageGenerationJob:
  generation attempt lifecycle metadata
```

Ownership rule:

- The job should have a direct required FK to `UserProfile`.
- `monster` should be nullable because a job may fail or be blocked before a `Monster` row exists.
- A nullable image reference is useful so successful jobs can point to the image they produced.

Tasks:

- [] Check whether `MonsterImageGenerationJob` already exists; if so, extend rather than replace.
- [] Add UUID primary key.
- [] Add required `owner` FK to `UserProfile`.
  - Owner is always derived from verified auth later.
  - Never accept owner/user ids from client input.
- [] Add nullable `monster` FK to `Monster`.
  - Nullable because a job may exist before or without a saved monster.
  - Prefer `SET_NULL` so job history can survive monster deletion.
- [] Add nullable `image` FK or OneToOne to `MonsterImage`.
  - Only set when the job succeeds.
  - Do not store image URL directly on the job.
- [] Add `status` with choices:
  - `queued`
  - `running`
  - `succeeded`
  - `failed`
  - `blocked`
- [] Do not add `canceled` yet unless actual cancellation behavior exists.
- [] Add `generation_mode` with choices:
  - `fake`
  - `real`
- [] Add `sanitized_prompt`.
  - Safe prompt text only.
  - Do not store raw prompt.
- [] Add optional `prompt_version` if useful.
  - This is useful when prompt-builder logic changes later.
- [] Add optional `prompt_hash` if useful.
  - This can help debugging/deduping without exposing raw prompt variants.
- [] Add safe provider metadata:
  - `provider`
  - `provider_model`
  - optional `provider_request_id`
- [] Add notification fields:
  - `should_email_when_done`
  - `notified_at`
  - `notification_error_code`
  - `notification_error_message`
- [] Add failure fields:
  - `error_code`
  - `safe_error_message`
- [] Add lifecycle timestamps:
  - `started_at`
  - `finished_at`
  - `created_at`
  - `updated_at`
- [] Add practical model constraints where reasonable:
  - queued has no started/finished/image/error
  - running has `started_at`, no finished/image/error
  - succeeded has `started_at`, `finished_at`, image, and no error
  - failed/blocked have `started_at`, `finished_at`, error, and no image
  - notification fields are empty unless `should_email_when_done` is true
- [] Add indexes:
  - owner + created date
  - owner + status + created date
  - monster + created date
  - generation mode + status
- [] Do not duplicate `Monster` fields such as:
  - `display_name`
  - `element`
  - `habitat`
  - `personality`
  - `color_palette`
  - `flavor_text`
- [] Do not store raw provider response.
- [] Do not store raw prompt.
- [] Store only sanitized/safe provider metadata.

Suggested choices:

```py
class MonsterImageGenerationStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    BLOCKED = "blocked", "Blocked"


class MonsterImageGenerationMode(models.TextChoices):
    FAKE = "fake", "Fake"
    REAL = "real", "Real"
```

Suggested shape:

```py
class MonsterImageGenerationJob(models.Model):
    """
    Durable lifecycle record for one monster image generation attempt.

    Raw prompts and raw provider responses are never stored here.
    Monster trait metadata belongs on Monster, not this model.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    owner = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="image_generation_jobs",
    )

    monster = models.ForeignKey(
        Monster,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="image_generation_jobs",
    )

    image = models.OneToOneField(
        MonsterImage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generation_job",
    )

    status = models.CharField(
        max_length=20,
        choices=MonsterImageGenerationStatus.choices,
        default=MonsterImageGenerationStatus.QUEUED,
    )

    generation_mode = models.CharField(
        max_length=10,
        choices=MonsterImageGenerationMode.choices,
    )

    sanitized_prompt = models.TextField(blank=True)
    prompt_version = models.CharField(max_length=40, blank=True)
    prompt_hash = models.CharField(max_length=64, blank=True)

    provider = models.CharField(max_length=50)
    provider_model = models.CharField(max_length=100)
    provider_request_id = models.CharField(max_length=120, blank=True)

    should_email_when_done = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)
    notification_error_code = models.CharField(max_length=100, blank=True)
    notification_error_message = models.TextField(blank=True)

    error_code = models.CharField(max_length=100, blank=True)
    safe_error_message = models.TextField(blank=True)

    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Constraint note:

- Use `CheckConstraint` where it stays readable.
- Do not turn constraints into unreadable cleverness.
- State constraints are useful, but service transition functions will be added later if/when generation orchestration is implemented.

Verification for this sub-step:

- [] job has direct required `owner` FK.
- [] job has nullable `monster` relation.
- [] job has nullable `image` relation.
- [] status choices are exactly scoped to current real behavior.
- [] no raw prompt field exists.
- [] no raw provider response field exists.
- [] no monster trait fields are duplicated on the job.
- [] impossible states are constrained where practical.

---

#### Step 2d Add Monster Serializers

branch: image-gen-contract-foundation

Purpose:

Expose stable request/response DTOs for `Monster` without exposing ownership as writable client input.

API shape guidance:

- The database stores trait fields as flat model columns.
- The API should expose traits as a nested object because that is cleaner for frontend code.

Preferred response shape:

```json
{
	"id": "uuid",
	"display_name": "Mucksnout",
	"traits": {
		"element": "Bogfire",
		"habitat": "Mushroom swamp",
		"personality": "grumpy",
		"color_palette": "mud green and ember orange"
	},
	"flavor_text": "A cranky little swamp goblin.",
	"created_at": "...",
	"updated_at": "..."
}
```

Tasks:

- [] Add `MonsterTraitsSerializer`.
  - Fields: `element`, `habitat`, `personality`, `color_palette`.
  - Validate `element` as free text, max `20` characters.
  - Validate all trait strings are trimmed and non-blank.
- [] Add `MonsterSerializer` for read/response shape.
  - Include `id`.
  - Include `display_name`.
  - Include nested `traits`.
  - Include `flavor_text`.
  - Include `created_at` and `updated_at`.
  - Do not expose `owner` as writable.
  - Do not expose raw image fields.
  - Do not expose generation job fields.
- [] Add `MonsterCreateSerializer`.
  - Accept `display_name`.
  - Accept nested `traits`.
  - Accept optional `flavor_text`.
  - Do not accept `owner` from client input.
  - Set `owner` from serializer context when used by later API code.
- [] Add `MonsterUpdateSerializer`.
  - Allow partial updates to `display_name`, `traits`, and `flavor_text`.
  - Keep owner immutable.
  - Do not add visibility updates because visibility is not in scope.
- [] Keep serializer names semantic and boring.
- [] Treat this as API contract design, not frontend UI state design.

Suggested serializer split:

```txt
MonsterTraitsSerializer:
  nested traits object

MonsterSerializer:
  read response

MonsterCreateSerializer:
  POST/write shape

MonsterUpdateSerializer:
  PATCH/write shape
```

Verification for this sub-step:

- [] create serializer rejects/ignores client-supplied owner fields.
- [] update serializer cannot change owner.
- [] `element` is max `20` chars.
- [] blank trait values are rejected.
- [] response serializer exposes nested `traits`.
- [] no image fields appear on `MonsterSerializer`.
- [] no generation job fields appear on `MonsterSerializer`.

---

#### Step 2e Add MonsterImage Serializer

branch: image-gen-contract-foundation

Purpose:

Expose safe stored image metadata.

Tasks:

- [] Add `MonsterImageSerializer` for read/response shape.
- [] Include:
  - `id`
  - `public_image_url`
  - `provider`
  - `provider_model`
  - `created_at`
- [] Decide now whether `image_storage_path` should be exposed.
  - Default recommendation: do **not** expose it in public/frontend-facing serializers unless the frontend truly needs it.
  - It is mainly server-side cleanup metadata.
- [] Do not include image bytes.
- [] Do not include base64.
- [] Do not include raw provider response.
- [] Do not include `is_primary` because it is not in this phase.

Verification for this sub-step:

- [] serializer exposes safe image display metadata.
- [] serializer does not expose bytes/base64.
- [] serializer does not expose raw provider response.
- [] `image_storage_path` exposure decision is explicit.
- [] serializer does not include `is_primary`.

---

#### Step 2f Add MonsterImageGenerationJob Serializers

branch: image-gen-contract-foundation

Purpose:

Expose generation job state in a frontend-friendly way without making the Django model weird. The database can stay flat; the serializer may expose nested status/lifecycle, notification, error, and image objects where helpful.

Important:

- Backend serializers may generate a single `MonsterImageGenerationJob` OpenAPI schema rather than perfect discriminated unions.
- That is acceptable.
- Do not weaken backend serializer correctness just to make OpenAPI easier.
- Frontend can later wrap/refine the parsed backend DTO into stricter discriminated UI state types.

Tasks:

- [] Add `MonsterImageGenerationJobSerializer` for read/response shape.
- [] Include safe fields:
  - `id`
  - `monster`
  - `status`
  - `generation_mode`
  - `provider`
  - `provider_model`
  - `created_at`
  - `updated_at`
  - `started_at`
  - `finished_at`
- [] Include `should_email_when_done` or a nested notification object.
  - Nested object is cleaner for frontend shape.
  - Flat fields are acceptable if simpler for OpenAPI.
- [] Include `error_code` and `safe_error_message` only as safe error fields.
- [] Include nested `monster_image` or `image` read serializer for succeeded jobs if the relation exists.
- [] Decide whether `sanitized_prompt` should be exposed.
  - Default recommendation: do **not** expose it in normal frontend-facing serializer unless explicitly needed for dev/admin/debug views later.
  - It is safe-ish, but still prompt-like user content.
- [] Do not expose raw prompt.
- [] Do not expose raw provider response.
- [] Do not expose internal-only notification error details beyond safe message/code.
- [] Add `MonsterImageGenerationJobCreateSerializer` only for request-shape definition.
  - Accept `should_email_when_done` if needed.
  - Accept optional `monster_id` if the flow supports attaching to an existing monster.
  - Do not accept `owner`.
  - Do not accept `status`.
  - Do not accept provider fields.
  - Do not accept prompt/internal fields unless they are explicitly user-facing request fields.
- [] Add a notification update serializer only if needed by the current contract shape.
  - Keep it limited to `should_email_when_done`.
  - Do not allow arbitrary notification recipient email yet.

Suggested response shape concept:

```json
{
	"id": "uuid",
	"monster": "uuid-or-null",
	"status": "running",
	"generation_mode": "fake",
	"provider": "fake",
	"provider_model": "fake-fixture-v1",
	"notification": {
		"should_email_when_done": true,
		"notified_at": null,
		"notification_error": null
	},
	"error": null,
	"image": null,
	"started_at": "...",
	"finished_at": null,
	"created_at": "...",
	"updated_at": "..."
}
```

Verification for this sub-step:

- [] read serializer exposes safe lifecycle fields.
- [] succeeded jobs can include image metadata.
- [] failed/blocked jobs can include safe error fields.
- [] create serializer does not accept owner/status/provider/internal fields.
- [] raw prompt is not exposed.
- [] raw provider response is not exposed.
- [] sanitized prompt exposure decision is explicit.

---

#### Step 2g Add Serializer-Level OpenAPI Hints Where Needed

branch: image-gen-contract-foundation

Purpose:

Keep the serializer/OpenAPI contract readable without adding endpoint implementations in this step.

Tasks:

- [] Add serializer-level field help text where it improves generated schema clarity.
- [] Add DRF Spectacular helpers only where needed for serializer fields that cannot be inferred cleanly.
- [] Do not add new API endpoints in this step.
- [] Do not add job transition endpoints in this step.
- [] Do not add view logic in this step.
- [] Do not add frontend generated types in this step.
- [] If serializers are not yet wired to views, note that full OpenAPI schema visibility may come later when endpoints are added.

Verification for this sub-step:

- [] serializer fields have clear generated names.
- [] schema hints do not expose internal-only fields.
- [] no endpoint implementation was added.
- [] no frontend type generation was added.

---

#### Step 2h Create And Inspect Migrations

branch: image-gen-contract-foundation

Purpose:

Create the database migration for the model changes and verify it does exactly what is expected.

Tasks:

- [] Run `python manage.py makemigrations monsters`.
- [] Open and read the generated migration file before committing.
- [] Confirm the migration creates or updates only the intended monster/image/job tables.
- [] Confirm no destructive changes to existing tables.
- [] Confirm no accidental nullable/non-nullable mismatch.
- [] Confirm no accidental default value weirdness.
- [] Confirm indexes and constraints are present if added.
- [] Run `python manage.py migrate` locally to apply.

Commands:

```bash
cd backend
python manage.py makemigrations monsters
python manage.py migrate
```

Verification for this sub-step:

- [] migration file is created.
- [] migration file was manually inspected.
- [] migration contains no destructive accidental changes.
- [] local migration applies successfully.

---

#### Step 2i Run Backend Checks And Existing Tests

branch: image-gen-contract-foundation

Purpose:

Verify the new models and serializers do not break the backend.

This sub-step runs existing checks/tests only. Do not add new automated tests in this step unless the master plan explicitly moves testing into this step later.

Tasks:

- [] Run Django system checks.
- [] Run existing backend tests.
- [] Fix import errors, app registration issues, migration issues, and obvious serializer/model problems.
- [] Do not call external AI providers.
- [] Do not call storage providers.
- [] Do not add fake generation services here.

Commands:

```bash
cd backend
python manage.py check
python manage.py test
```

Verification for this sub-step:

- [] `python manage.py check` passes.
- [] `python manage.py test` passes with existing tests.
- [] no external AI/provider/storage calls occur.
- [] no unrelated app behavior is changed.

---

#### Step 2j Generate And Inspect Backend OpenAPI Schema If Available

branch: image-gen-contract-foundation

Purpose:

Inspect backend schema output for the new serializer contract where possible.

Important scope boundary:

- This step may generate and inspect the backend OpenAPI file.
- This step does **not** generate frontend TypeScript types.
- This step does **not** add or modify API endpoint implementations just to force schemas to appear.

Tasks:

- [] Run backend OpenAPI generation if the command is already configured.
- [] Open the generated schema file.
- [] Confirm model/serializer names are reasonable where they appear.
- [] Confirm no internal-only fields are exposed.
- [] Confirm no raw prompt field is exposed.
- [] Confirm no raw provider response field is exposed.
- [] Confirm no image bytes/base64 fields are exposed.
- [] If schemas do not appear yet because endpoint wiring happens in a later step, document that and do not add dummy endpoints here.

Command:

```bash
cd backend
python manage.py spectacular --file openapi.yaml
```

Verification for this sub-step:

- [] OpenAPI generation succeeds if currently configured.
- [] generated schema contains no unsafe internal fields.
- [] generated schema does not expose raw prompt/provider response data.
- [] generated schema does not expose image bytes/base64.
- [] no frontend type generation was performed.

---

#### Step 2 Definition Of Done

branch: image-gen-contract-foundation

Step 2 is complete when:

- [] `Monster` model exists with owner, display name, custom free-text element, habitat, personality, color palette, flavor text, and timestamps.
- [] `Monster` does not store image data, image URL, storage path, provider data, or generation lifecycle state.
- [] `MonsterImage` model exists with monster relation, public image URL, storage path, safe provider metadata, and created timestamp.
- [] `MonsterImage` does not store image bytes/base64 or raw provider response.
- [] `MonsterImageGenerationJob` model exists with owner, optional monster, optional image, status, generation mode, safe prompt/provider metadata, notification fields, safe error fields, and lifecycle timestamps.
- [] `MonsterImageGenerationJob` does not duplicate monster trait fields.
- [] `MonsterImageGenerationJob` does not store raw prompt or raw provider response.
- [] serializers exist for monster, monster image, and image generation job read/write shapes as scoped above.
- [] serializers do not accept client-provided owner/status/provider/internal fields where those fields must be server-controlled.
- [] migration is created and inspected.
- [] local migrate succeeds.
- [] `python manage.py check` passes.
- [] existing backend tests pass.
- [] backend OpenAPI generation/inspection is performed if currently possible.
- [] no endpoint implementations were added.
- [] no admin customization was added.
- [] no seeding was added.
- [] no frontend type generation was added.
- [] no frontend Zod schemas were added.
- [] no real or fake image generation service was added.

### Step 3 Add Backend Model Constraints And Transition Services

branch: image-gen-contract-foundation

Purpose:

Prevent impossible backend job states.

#### Step 3a Add TextChoices For Status And Mode Fields

- [] Add `JobStatus(models.TextChoices)` with `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `BLOCKED`.
- [] Add `GenerationMode(models.TextChoices)` with `FAKE`, `REAL`.
- [] Apply these to the appropriate model fields using `choices=` and `default=`.
- [] Confirm Django migration captures the choices correctly (they are not enforced at DB level by default, so model constraints will be needed).

Be comprehensive. Model types should only allow valid states. Including but not limited to things like:

- A succeeded job must have no error_code and a finished_at timestamp.
- A failed job must have an error_code and a finished_at timestamp.
- A job where should_email_when_done is true should have a notified_at timestamp when finished_at is set; a job where it's false shouldn't have a notified_at. Stuff like that.
- Model possible states for each status type and make sure those are enforced.
- Note that we'll be modeling similar states on the frontend.

#### Step 3b Add Model Level Constraints

- [] Add a `CheckConstraint` or validation in `clean()` ensuring: succeeded jobs have no error_code; failed/blocked jobs have an error_code; terminal states have `finished_at` set, etc etc.
- [] Prefer `clean()` + `save()` override if `CheckConstraint` is too verbose for multi-field rules.
- [] Do not make constraints so strict they block valid admin creation flows.

#### Step 3c Add generation_jobs.py Service File

- [x] Create `backend/apps/monsters/services/generation_jobs.py`.
- [x] Create `backend/apps/monsters/services/__init__.py`.
- [x] Import the `MonsterImageGenerationJob` model at the top.
- [x] Keep service functions as plain module-level functions, not a class.

#### Step 3d Implement create_generation_job

- [x] Signature: `create_generation_job(owner, generation_mode, should_email_when_done=False) -> MonsterImageGenerationJob`.
- [x] Sets `status=QUEUED`, `started_at=None`, `finished_at=None`.
- [x] Returns the saved job instance.

#### Step 3e Implement mark_job_running

- [x] Signature: `mark_job_running(job: MonsterImageGenerationJob) -> MonsterImageGenerationJob`.
- [x] Raises `InvalidJobTransition` if status is not `QUEUED`.
- [x] Sets `status=RUNNING`, `started_at=now()`.
- [x] Saves and returns.

#### Step 3f Implement mark_job_succeeded

- [x] Signature: `mark_job_succeeded(job, monster_image) -> MonsterImageGenerationJob`.
- [x] Raises `InvalidJobTransition` if status is not `RUNNING`.
- [x] Sets `status=SUCCEEDED`, `finished_at=now()`, links `monster_image`.
- [x] Ensures no `error_code` is set.
- [x] Saves and returns.

#### Step 3g Implement mark_job_failed And mark_job_blocked

- [x] `mark_job_failed(job, error_code, safe_error_message)` — allows transition from `RUNNING` or `QUEUED`.
- [x] `mark_job_blocked(job, error_code, safe_error_message)` — allows transition from `RUNNING`.
- [x] Both set `finished_at=now()` and ensure no image is attached.
- [x] Both raise `InvalidJobTransition` for invalid source states.
- [x] Define `InvalidJobTransition` as a custom exception in the service module.

Transition service functions should cover:

```txt
create_generation_job()
mark_job_running()
mark_job_succeeded()
mark_job_failed()
mark_job_blocked()
```

Rules:

- A succeeded job has an image and no error.
- A failed job has an error and no image.
- A blocked job has an error and no image.
- A queued/running job has no final image and no final error.
- `finished_at` is set only for terminal states.
- `started_at` is set when running begins.
- Document on the model page what each status is supposed to look like.

Verification:

```bash
cd backend
python manage.py check
python manage.py test apps.monsters
```

Success criteria:

- [] Invalid transitions raise a clear exception.
- [] Tests cover happy path and failure path.
- [] Model constraints do not block valid creation.
- [] Admin cannot casually create impossible successful jobs.

### Step 4 Add Serializers And OpenAPI Contract Shape

NOTE This was combined with the original step 2. So we should already have this finished by the time you get here.

### Step 5 Add Backend API Endpoints For Contract Testing

branch: image-gen-contract-foundation

Purpose:

Create enough API surface for fake lifecycle and frontend contract work.

#### Step 5a Wire Monsters App URLs Into Config

- [] Create `backend/apps/monsters/urls.py`.
- [] Include it in `backend/config/urls.py` under `/api/`.
- [] Confirm URL prefix convention matches existing apps (e.g. `/api/monsters/`).

#### Step 5b Add Monster List And Create Views

- [] `GET /api/monsters/` — returns authenticated user's monsters only.
- [] `POST /api/monsters/` — creates a monster owned by the requesting user.
- [] Use `SupabaseJWTAuthentication` and `IsAuthenticated` from existing auth setup.

#### Step 5c Add Monster Detail Update And Delete Views

- [] `GET /api/monsters/{monster_id}/` — returns monster if owned by requesting user.
- [] `PATCH /api/monsters/{monster_id}/` — partial update of allowed fields.
- [] `DELETE /api/monsters/{monster_id}/` — deletes if owned by requesting user.
- [] Return 404 (not 403) when a user requests another user's monster.

#### Step 5d Add Image Generation Job Create And Detail Views

- [] `POST /api/imageGeneration-jobs/` — creates a job owned by requesting user; uses `create_generation_job()` service.
- [] `GET /api/imageGeneration-jobs/{job_id}/` — returns job if owned by requesting user.
- [] Both require authentication.

#### Step 5e Add Notification Toggle Endpoint

- [] `PATCH /api/imageGeneration-jobs/{job_id}/notification/` — sets `should_email_when_done` for queued/running jobs.
- [] Return 400 if job is already in a terminal state.

#### Step 5f Add Auth Protection And Ownership Checks

- [] All endpoints require `IsAuthenticated`.
- [] Add an `IsOwner` object-level permission or inline `get_object()` override.
- [] Write a quick sanity test: user A cannot access user B's monster.

#### Step 5g Add Trusted Server Transition Endpoint Stubs

- [] Add stub views for `POST /api/imageGeneration-jobs/{job_id}/mark-running/` etc. — return 501 Not Implemented for now.
- [] These will be fully implemented in Step B6 once the trust boundary is designed.
- [] Registering them now lets OpenAPI include them in the generated schema.

Recommended endpoints:

```txt
GET    /api/monsters/
POST   /api/monsters/
GET    /api/monsters/{monster_id}/
PATCH  /api/monsters/{monster_id}/
DELETE /api/monsters/{monster_id}/

POST   /api/imageGeneration-jobs/
GET    /api/imageGeneration-jobs/{job_id}/
PATCH  /api/imageGeneration-jobs/{job_id}/notification/
```

Potential later/internal endpoints:

```txt
POST /api/imageGeneration-jobs/{job_id}/mark-running/
POST /api/imageGeneration-jobs/{job_id}/mark-succeeded/
POST /api/imageGeneration-jobs/{job_id}/mark-failed/
POST /api/imageGeneration-jobs/{job_id}/mark-blocked/
```

Design note:

The trusted Next-server-to-Django flow needs a little more design before real provider implementation. Do not make unsafe public mutation endpoints that any authenticated user can abuse.

Verification:

```bash
cd backend
python manage.py test apps.monsters
python manage.py spectacular --file openapi.yaml
```

Success criteria:

- [] Missing auth gets 401.
- [] User cannot access another user's monsters/jobs.
- [] OpenAPI includes the new endpoints.
- [] API returns predictable error shapes.
- [] No endpoint accepts `owner_id` as authority.

### Step 6 Add Django Admin Visibility

branch: image-gen-contract-foundation

Purpose:

Make the new data inspectable before UI work begins.

#### Step 6a Register Monster Admin

- [x] Create/update `backend/apps/monsters/admin.py`.
- [x] Register `Monster` with `list_display` of `id`, `owner`, `name`, `created_at`, `updated_at`.
- [x] Add `list_filter` on `created_at` and `visibility` if it exists.
- [x] Add `search_fields` on `name` and `owner__email` or equivalent.
- [x] Make `id`, `created_at`, `updated_at`, `owner` read-only.

#### Step 6b Register MonsterImage Admin

- [x] Register `MonsterImage` with `list_display` of `id`, `monster`, `is_primary`, `provider`, `created_at`.
- [x] Add image preview helper: a read-only field that renders the `public_image_url` as an `<img>` tag if non-null.
- [x] Make the image preview safe — escape the URL and size-cap the thumbnail.
- [x] Make `image_storage_path` visible but not editable.

#### Step 6c Register MonsterImageGenerationJob Admin

- [x] Register `MonsterImageGenerationJob` with `list_display` of `id`, `status`, `owner`, `generation_mode`, `should_email_when_done`, `created_at`, `duration`.
- [x] Add `list_filter` on `status`, `generation_mode`.
- [x] Add `search_fields` on owner email.
- [x] Add a `duration` computed display field showing `finished_at - started_at` if both are set.
- [x] Add `safe_error_message` and `error_code` visible on the detail page.

#### Step 6d Add Admin Helper Methods

- [x] `image_preview(obj)` — returns safe HTML thumbnail or "(none)" for MonsterImage.
- [x] `duration(obj)` — returns formatted timedelta or "(pending)" for job admin.
- [x] `sanitized_prompt_preview(obj)` — truncates to 100 chars for the job list.
- [x] Mark all helpers with `short_description` attribute.
- [x] Do not display raw secrets, access tokens, or provider keys in any admin view.

#### Step 6e Manual Admin Smoke Check

- [] Log into Django admin locally.
- [] Confirm Monster section appears.
- [] Confirm MonsterImage section appears.
- [] Confirm MonsterImageGenerationJob section appears.
- [] Confirm list pages do not crash when image fields are blank.
- [] Confirm admin search/filter works for basic fields.

Admin expectations:

`MonsterImageGenerationJobAdmin` should show:

```txt
id
status
owner
monster
provider
provider_model
generation_mode
should_email_when_done
created_at
started_at
finished_at
duration
error_code
```

Verification:

```bash
cd backend
python manage.py check
python manage.py test apps.monsters
```

Manual verification:

- [] Log into Django admin locally.
- [] Monster section appears.
- [] MonsterImage section appears.
- [] MonsterImageGenerationJob section appears.
- [] List pages do not crash when image fields are blank.
- [] Admin search/filter works for basic fields.

### Step 7 Add Admin And Management Command Fake Monster Seeding

branch: image-gen-contract-foundation

Purpose:

Create fake monsters safely for development and production smoke checks without a public `/dev` route.

Decision:

Use Django admin and a management command first. Do not build a frontend `/dev` route in Phase 0.

#### Step 7a Create Management Command Directory Structure

- [x] Create `backend/apps/monsters/management/__init__.py`.
- [x] Create `backend/apps/monsters/management/commands/__init__.py`.
- [x] Create `backend/apps/monsters/management/commands/seed_fake_monsters.py`.

#### Step 7b Implement seed_fake_monsters Command

- [x] Accept `--email <user-email>` and `--num-monsters <int>` arguments.
- [x] Look up `UserProfile` by email; fail with a clear error if not found.
- [x] Create `num_monsters` fake `Monster` rows owned by that user.
- [x] Create a fake `MonsterImage` for each with a known fixture public URL.
- [x] Create a fake `MonsterImageGenerationJob` with status `SUCCEEDED` for each.
- [x] Guard the command with `settings.ENABLE_DEV_ADMIN_ACTIONS` — raise `CommandError` if not enabled.
- [x] Never call a real AI provider.
- [x] Output a clear success message listing created IDs.

#### Step 7c Add UserProfileAdmin Seed Action

- [x] In `accounts/admin.py`, add a `seed_fake_monsters` admin action for `UserProfileAdmin`.
- [x] Guard with `settings.ENABLE_DEV_ADMIN_ACTIONS`.
- [x] Seed 3 fake monsters for each selected user.
- [x] Display a success message with count.

#### Step 7d Add MonsterAdmin Attach Fake Image Action

- [x] Add an `attach_fake_image` admin action to `MonsterAdmin`.
- [x] Creates a `MonsterImage` with a fixture URL for each selected Monster that has no primary image.
- [x] Guard with `settings.ENABLE_DEV_ADMIN_ACTIONS`.
- [x] Skip monsters that already have a primary image to keep the action idempotent.

#### Step 7e Add ENABLE_DEV_ADMIN_ACTIONS Guard

- [x] Add `ENABLE_DEV_ADMIN_ACTIONS = env.bool('ENABLE_DEV_ADMIN_ACTIONS', default=False)` in `settings.py`.
- [x] Confirm `False` by default in production unless explicitly set in the environment.
- [x] Add a comment explaining why this exists and what it enables.

#### Step 7f Manual Seeding Verification

> Skipped: user adds monsters directly via Django admin, so manual seeding verification via CLI and browser is not needed.

- [x] Set `ENABLE_DEV_ADMIN_ACTIONS=True` in local `.env`.
- [x] Run `python manage.py seed_fake_monsters --email <your-email> --num-monsters 3`.
- [x] Confirm seeded monsters appear in Django admin.
- [x] Confirm seeded images use fixture URLs (no real provider call).
- [x] Use admin action on selected user in Django admin and confirm it works.
- [x] Confirm running the command twice creates new rows (or documents if it should be idempotent).

Recommended tools:

```txt
python manage.py seed_fake_monsters --email <user-email> --num-monsters 3
```

Admin actions:

```txt
UserProfileAdmin:
  seed fake monsters for selected users

MonsterAdmin:
  attach fake image to selected monsters if missing

MonsterImageGenerationJobAdmin:
  create fake succeeded job for selected monsters if useful
```

Rules:

- Fake seeded monsters belong to a real `UserProfile`.
- Put user-targeted seed action under `UserProfileAdmin`, because ownership starts with the user.
- Keep normal Django admin Add/Edit Monster forms available for custom manual fake monsters.
- Add a simple "attach fake image" admin action instead of inventing a custom form too early.
- Guard dev/admin actions with a setting such as `ENABLE_DEV_ADMIN_ACTIONS`.
- If enabled in production while unpublished, make that explicit through environment config.
- Never call real AI providers from seed commands or admin seed actions.

Potential future improvement:

If admin actions are too clunky, design a protected `/dev` route later. Do not add it now.

Verification:

```bash
cd backend
python manage.py seed_fake_monsters --help
python manage.py test apps.monsters
```

Manual verification:

> Skipped: user adds monsters directly via Django admin, so end-to-end manual verification is not needed.

- [] Run seed command locally against a known user.
- [] Confirm seeded monsters appear in Django admin.
- [] Confirm seeded images use fake/public fixture URLs.
- [] Use admin action on selected user locally.
- [] Confirm no real provider call happens.
- [] Confirm seeding is idempotent enough for repeated dev use or clearly documents if it creates new rows every time.

### Step 8 Add Backend Tests For Phase 0

branch: image-gen-contract-foundation

Purpose:

Lock the backend foundation before frontend/server branches begin.

#### Step 8a Add test_models.py

- IMPORTANT: No external calls in tests, these all run internal.
- [x] Test `Monster` creation with valid fields.
- [x] Test that `Monster` cannot be created with a client-supplied `owner_id` bypass.
- [x] Test `MonsterImage` creation with and without a `public_image_url`.
- [x] Test `MonsterImageGenerationJob` creation defaults (status=`QUEUED`, no `finished_at`).
- [x] Test model `clean()` or constraint raises on impossible states (succeeded with error_code, etc.).
- Be comprehensive in testing valid and invalid states for the job model, including edge cases. I want to trust that all data structures sent and received model valid states.

#### Step 8b Add test_generation_jobs.py

- IMPORTANT: No external calls in tests, these all run internal.
- [x] Test `create_generation_job()` creates a QUEUED job.
- [x] Test `mark_job_running()` transitions from QUEUED to RUNNING and sets `started_at`.
- [x] Test `mark_job_running()` raises `InvalidJobTransition` if already RUNNING or SUCCEEDED.
- [x] Test `mark_job_succeeded()` transitions from RUNNING, sets `finished_at`, attaches image.
- [x] Test `mark_job_failed()` from RUNNING sets error fields and `finished_at`.
- [x] Test `mark_job_blocked()` from RUNNING sets error fields and `finished_at`.
- [x] Test that succeeded job has no `error_code` and failed job has no image.

#### Step 8c Add test_serializers.py

- IMPORTANT: No external calls in tests, these all run internal.
- [x] Test `MonsterSerializer` serializes valid `Monster` instances correctly.
- [x] Test `MonsterCreateSerializer` rejects client-provided `owner` field.
- [x] Test `MonsterImageGenerationJobSerializer` does not expose `sanitized_prompt`.
- [x] Test `MonsterImageGenerationJobCreateSerializer` rejects `status` field.
- [x] Test serializer validation for required fields.

#### Step 8d Add test_monster_api.py

- IMPORTANT: No external calls in tests, these all run internal.
- [x] Test unauthenticated request returns 401 on all monster endpoints.
- [x] Test authenticated user can list only their own monsters.
- [x] Test authenticated user cannot GET another user's monster (gets 404).
- [x] Test authenticated user cannot PATCH or DELETE another user's monster.
- [x] Test authenticated user can create a monster.
- [x] Test unauthenticated request returns 401 on job endpoints.
- [x] Test user cannot access another user's job.

#### Step 8e Add test_admin_actions.py

- IMPORTANT: No external calls in tests, these all run internal.
- [x] Test `attach_fake_image` admin action creates a `MonsterImage` for a monster without one.
- [x] Test `attach_fake_image` skips monsters that already have a primary image.
- [x] Test admin actions are blocked when `ENABLE_DEV_ADMIN_ACTIONS=False`.

#### Step 8f Add test_seed_fake_monsters.py

- IMPORTANT: No external calls in tests, these all run internal.
- [x] Test command creates the expected number of monsters for a valid user email.
- [x] Test command fails with `CommandError` for an unknown email.
- [x] Test command is blocked when `ENABLE_DEV_ADMIN_ACTIONS=False`.
- [x] Test no real provider is called during seeding.

#### Step 8g Run Full Backend Suite

- [x] Run `python manage.py test`.
- [x] Confirm all tests pass.
- [x] Confirm no tests make network calls.

Important:

No external calls.

No real image providers.

No real email.

No real Supabase Storage.

Verification:

```bash
cd backend
python manage.py test
```

Success criteria:

- [x] Backend test suite passes.
- [x] Tests prove users cannot access another user's monsters/jobs.
- [x] Tests prove invalid job states are rejected.
- [x] Tests prove fake seeding works.
- [x] No network calls happen in tests.

### Step 9 Generate OpenAPI And Frontend Types

branch: image-gen-contract-foundation

Purpose:

Make the frontend consume the backend contract.

#### Step 9a Generate OpenAPI Schema

- [x] Run `python manage.py spectacular --file openapi.yaml` (or actual project command from Step 0e).
- [x] Confirm the command succeeds without errors.
- [x] Confirm `openapi.yaml` is updated at the expected path.

#### Step 9b Regenerate Frontend Types

- [x] Run the frontend type generation command (e.g. `npm run generate:api`) from Step 0e.
- [x] Confirm the command succeeds.
- [x] Confirm the generated file is updated.

#### Step 9c Inspect Generated Type Names

- [x] Open the generated TypeScript file.
- [x] Confirm `Monster`, `MonsterImage`, `MonsterImageGenerationJob` types are present.
- [x] Confirm field names match the serializer output (no unexpected renames from the generator).
- [x] Note any generated names that are awkward — alias them in Zod schemas rather than editing generated files.

#### Step 9d Commit Generated Artifacts

- [] If the project convention is to commit generated files, add `openapi.yaml` and the generated types file to the commit.
- [] If the project convention is to regenerate on install/build, confirm the generation step is in the build script.
- [] Do not manually edit the generated files.

Commands may look like:

```bash
cd backend
python manage.py spectacular --file openapi.yaml

cd ../frontend
npm run generate:api
```

Adjust to actual project commands.

Verification:

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Success criteria:

- [x] Generated types compile.
- [x] No generated file was manually edited.
- [x] New generated types are available for imports.
- [x] Frontend typecheck still passes.

### Step 10 Add Frontend Zod Schemas And Drift Checks

branch: image-gen-contract-foundation

Purpose:

Add runtime validation and compile-time drift checks.

#### Step 10a Add Monster Zod Schema

- [] Create `frontend/src/lib/api/schemas/Monster.ts`.
- [] Define `monsterSchema` as a `z.object({...})` matching the generated `Monster` type.
- [] Export `type Monster = z.infer<typeof monsterSchema>`.
- [] Add a compile-time drift check: `type _MonsterDriftCheck = Expect<Equal<Monster, GeneratedMonster>>`.

#### Step 10b Add MonsterImage Zod Schema

- [] Create `frontend/src/lib/api/schemas/MonsterImage.ts`.
- [] Define `monsterImageSchema` with all fields from the serializer.
- [] Export inferred type and drift check.

#### Step 10c Add MonsterImageGenerationJob Zod Schema

- [] Create `frontend/src/lib/api/schemas/MonsterImageGenerationJob.ts`.
- [] Define `monsterImageGenerationJobSchema`.
- [] Consider using `z.discriminatedUnion('status', [...])` if the backend shape supports it; otherwise use a flat schema and wrap into UI state types separately.
- We want to model valid states, so we'll create a comprehensive set of possible job states (queued and the other possible statuses). We want to make sure to do this one the right way.
- [] Export inferred type and drift check.

#### Step 10d Add Compile-Time Drift Checks

- [] We have a helper to ensure no drift checks in type-assertions.ts
- [] If the generated type and Zod schema drift, TypeScript will error at the drift check line — this is intentional.

#### Step 10e Confirm Frontend Typecheck Still Passes

- [] Run `npx tsc --noEmit`.
- [] Run `npm run lint`.
- [] Run `npm test -- --run`.
- [] Fix any type errors from drift checks before proceeding.

Rules:

- Do not cast raw API responses.
- Do not use `any`.
- Use `unknown` at boundaries.
- If the backend schema is awkward, wrap/refine it into frontend UI types separately instead of weakening the schema.

Verification:

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm test -- --run
```

Success criteria:

- [] Zod schemas parse valid fixture responses.
- [] Zod schemas reject obviously invalid fixture responses.
- [] Drift checks pass.
- [] No frontend DTOs are duplicated manually outside schema/type files.
- [] No `any` introduced.

### Step 11 Phase 0 Local Verification

branch: image-gen-contract-foundation

Purpose:

Prove Phase 0 works locally before merging.

Backend commands:

```bash
cd backend
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
python manage.py spectacular --file openapi.yaml
```

Frontend commands:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Manual checks:

- [] Django admin loads locally.
- [] New admin models appear.
- [] Seed fake monsters through management command.
- [] Seed fake monsters through admin action.
- [] API docs/schema route still works locally.
- [] Existing auth flow still works.
- [] Existing health smoke test still works.
- [] No Sentry spam from local smoke checks.

### Step 12 Phase 0 Merge And Production Verification

branch: image-gen-contract-foundation

Purpose:

Merge the contract foundation before parallel work begins.

Actions:

- [] Merge `image-gen-contract-foundation` into main.
- [] Let Render deploy backend.
- [] Let Vercel deploy frontend if frontend generated artifacts changed.
- [] Run production smoke checks.
- [] Do not enable real image provider calls.

Production checks:

- [] Render deploy succeeds.
- [] Vercel deploy succeeds.
- [] Production `/health` works.
- [] Production schema/docs route works if exposed.
- [] Production frontend still loads.
- [] Production frontend can still call production backend.
- [] Django admin loads in production.
- [] New admin models appear in production.
- [] If `ENABLE_DEV_ADMIN_ACTIONS` is intentionally enabled in prod, seed one fake monster for your own user and verify it appears.
- [] Sentry has no new health-check spam.
- [] No paid AI call occurs.

### Step 13 Documentation Pass

- Do all relevant documentation - specifically of API endpoints and models
- Don't overdo it

---

## Phase 1 Parallel Branch A Frontend Fake UI Flow

### Step A1 Create Create Page Shell

branch: image-gen-ui-flow

Purpose:

Create the main UI shell without waiting for real provider work.

#### Step A1a Create The Route File

- [x] Create `frontend/src/app/create/page.tsx`.
- [x] Export a default React Server Component (or Client Component if state needs it immediately).
- [x] Add the page to any nav or header links if applicable.

#### Step A1b Build Responsive Layout Shell

IMPORTANT: Need to make sure we've defined the design for this form. It says to make a preview but we can't preview imagaes since they haven't been created yet. Does that just mean preview of the stats, info etc the user inputs? Need to clarify and specify before proceeding.
UPDATE: We decided not to do the preview feature at all; there's no image until it's generated, so no point anyway.

- [x] Collapse to single column on mobile.
- [x] Use ShadCN `Card` as the visual container for each column.
- [x] Use Tailwind grid/flex utilities, not custom CSS.

#### Step A1c Add Form Placeholders

- [x] Add a placeholder div with "Form goes here"
- [x] These will be replaced in Steps A2 and A4.

#### Step A1d Add Empty State With Fake Mode Copy

- [x] Add visible fake-mode copy during development (e.g. a small badge or note) so it is obvious this is not calling real APIs.
- [x] This fake-mode copy can be removed or hidden in later phases.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [] `/create` loads.
- [] Mobile layout does not overflow.
- [] Desktop layout is not cramped.
- [] Light and dark modes are readable.
- [x] No real provider call exists.

### Step A2 Build Monster Generation Form

IMPORTANT: Need to make sure we've defined the design for this form. It says to make a preview but we can't preview imagaes since they haven't been created yet. Does that just mean preview of the stats, info etc the user inputs?

Update: Yeah, make it a nice card of sorts iwth a placeholder dummy image.

branch: image-gen-ui-flow

Purpose:

Collect the user inputs needed to build a monster.

#### Step A2a Define Form Zod Schema

- [x] Create a `monsterFormSchema` (separate from backend DTOs), if it's possible to validate the form on this
- Try not to install react-hook-form or similar if we can get away with it; this is a basic app
- [x] Include relevant monster fields
- [x] Use semantic field names (not `field1`, `value`, etc.).
- [x] Keep the schema in the component file or a nearby `schemas/` file, not in the shared API schemas.

#### Step A2b Build GenerateMonsterForm Component

- [x] Create `frontend/src/components/create/GenerateMonsterForm.tsx`.
- [x] Wrap each field in ShadCN `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.
- [x] Add a submit button that calls a passed-in `onSubmit` prop.

#### Step A2c Add All Form Fields

- IMPORTANT: Make sure that this matches whatever is on the Monster type - that's the source of truth, so adjust this to match those fields where needed.
- [x] `display_name`: text input, required, for the monster's name or name inspiration.
- [x] `element`: text input
- [x] `habitat`: text input
- [x] `personality`: short text (e.g. "grumpy", "mischievous").
- [x] `color_palette`: text or color chips (e.g. "deep purple and gold").
- [x] `flavor_text`: optional textarea.
- [x] All fields have visible labels. No placeholder-only labels.

#### Step A2d Add Validation Messages

- [x] Required field errors are shown inline below each field.
- [x] Use Zod messages, not hardcoded strings.
- [x] Submit button is not disabled by default (user should be able to attempt submit and see all errors at once).
- [x] Form state is reset on successful generation if that is the desired UX.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [] Invalid form shows useful errors.
- [] Valid form submits to fake handler.
- [] Form fields have labels.
- [] Keyboard navigation works.
- [] No raw backend DTO type is used as form draft state if a separate draft type is clearer.

### Step A3 Build Frontend Generation State Machine

branch: image-gen-ui-flow

Purpose:

Represent valid UI states only.

#### Step A3a Design Generation UI Discriminated Union Types

- [x] Hand-write the union in a dedicated file,, probably the same as where we keep the monster generation jbos schema
- [x] Define at minimum:
  - `{ status: 'idle' }`
  - `{ status: 'submitting', formValues: MonsterFormValues }`
  - `{ status: 'succeeded', monster: Monster, monsterImage: MonsterImage }`
  - `{ status: 'failed', safeErrorMessage: string }`
  - `{ status: 'blocked', safeErrorMessage: string }`
- [x] Keep generated backend DTO types (`Monster`, `MonsterImage`) separate from this UI state type.
- [x] Do not use scattered booleans (`isLoading`, `isError`, `hasImage`).

#### Step A3b Add Redux Slice Or Local Reducer

- NOTE not sure the below is best; check in with me when we get to this part.
- [x] If this state is page-local (only the `/create` page cares), use `useReducer` locally.
- [x] If this state needs to survive navigation (unlikely at this stage), use Redux.
- [x] Keep `MonsterImageGenerationJob` backend DTO out of Redux — map it into UI state at the boundary.
- [x] Define typed action creators or action union.

#### Step A3c Add State Transition Tests

- [x] Test `idle` → `submitting` transition.
- [x] Test `submitting` → `succeeded` transition.
- [x] Test `submitting` → `failed` transition.
- [x] Test `submitting` → `blocked` transition.
- [x] Test that `succeeded` cannot silently become `idle` without an explicit reset action.

Verification:

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm test -- --run
```

Success criteria:

- [x] Impossible UI states are not representable.
- [x] No `any`.
- [x] No broad typecasts.
- [x] Reducer/state tests cover basic transitions if using Redux.

### Step A4 Build Generation Progress UI

branch: image-gen-ui-flow

Purpose:

Make generation feel polished.

#### Step A4b Add GenerationProgressCard With Copy

- [x] Create `frontend/src/components/create/GenerationProgressCard.tsx`.
- [x] Show a spinner or progress indicator.
- [x] Use the copy: `"Image generation can take up to a minute. Keep this tab open while your monster is being generated."`
- [x] Do not use copy that implies the user can leave the page (that belongs to Phase 5).

#### Step A4c Add Skeleton Placeholder Visual

- [x] While in `submitting` state, render a skeleton in the monster image area.
- [x] Use ShadCN `Skeleton` primitive.
- [x] Match the approximate aspect ratio of a real generated image.

#### Step A4d Add Blocked And Error UI Variants

- [x] For `blocked` state: show a friendly message explaining the prompt was not allowed. Do not expose raw moderation output.
- [x] For `failed` state: show `safeErrorMessage` and an actionable retry button.
- [x] Neither state should leave the user stuck with no way forward.

#### Step A4e Add Retry Button And Submit Guard

- [x] The retry button dispatches a reset-to-idle action.
- [x] The submit button is disabled while `status === 'submitting'`.
- [x] The submit button cannot be activated twice without an explicit reset.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [] Loading state is visible.
- [] Error state is actionable.
- [] Blocked state is understandable.
- [] Buttons cannot be spam-clicked during submit.
- [] UI does not imply durable async if not implemented.

### Step A5 Build Result Actions

branch: image-gen-ui-flow

Purpose:

Let user do useful things after fake generation succeeds.

#### Step A5a Add Save Action

- [] If the backend monster create endpoint is ready (it should be after Phase 0), wire a Save button that calls `POST /api/monsters/` via the Django client.
- [] Show a saving spinner, then transition to a "saved" sub-state.
- [] If the backend is not yet ready, add a disabled stub button with a "saving not yet available" tooltip.
- [] Do not store the monster data in Redux as the canonical saved record — refetch from Django after save.

#### Step A5b Add View Gallery And Regenerate Actions

- [] "View Gallery" navigates to `/gallery`.
- [] "Regenerate" dispatches the reset-to-idle action and scrolls back to the form.
- [] Confirm Regenerate clears the previous result from UI state cleanly.

#### Step A5c Add Sign-In-To-Save Prompt For Logged-Out Users

- [] Check auth state (from existing Supabase auth context or Redux auth slice).
- [] If logged out: show a "Sign in to save your monster" prompt instead of the Save button.
- [] Do not hide the generated image from logged-out users — just prevent saving.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [] Logged-out user sees sign-in-to-save prompt.
- [] Logged-in user can save fake result if endpoint is ready.
- [] Regenerate resets state correctly.
- [] Result action buttons are accessible on mobile.

### Step A6 Build Gallery And Detail UI Against Fake Data

branch: image-gen-ui-flow

Purpose:

Build visual gallery experience before real generation.

#### Step A6a Build /gallery Page With GalleryGrid

- [] Create `frontend/src/app/gallery/page.tsx`.
- [] Create `frontend/src/components/gallery/GalleryGrid.tsx`.
- [] For now, pass fake/hardcoded fixture data as props to `GalleryGrid`.
- [] Use a CSS grid with sensible breakpoints (1 col mobile, 2-3 col tablet, 3-4 col desktop).

#### Step A6b Add Gallery Loading Skeleton And Empty State

- [] Create `frontend/src/components/gallery/EmptyGalleryState.tsx`.
- [] Show a CTA ("Create your first monster") with a link to `/create`.
- [] Add a loading skeleton that mirrors the grid layout using ShadCN `Skeleton`.
- [] Empty state should not be ugly — use an illustration or icon placeholder.

#### Step A6c Build MonsterCard Component

- Bold, beautiful. Should almost look like a holographic trading card. Really sell this.
- [] Create `frontend/src/components/monsters/MonsterCard.tsx`.
- [] Accept a `Monster` + `MonsterImage` (or a combined DTO) as props.
- [] Show the image, monster name, and a link to the detail page.
- [] Use ShadCN `Card` primitive.
- [] Handle missing/null image gracefully (show a placeholder).

#### Step A6d Build /gallery/[monsterId] Detail Shell

- [] Create `frontend/src/app/gallery/[monsterId]/page.tsx`.
- [] Accepts `params.monsterId` and looks up the monster from fixture data for now.
- [] Show monster name, image, and basic metadata.
- [] This will be wired to the real Django endpoint in Step 14.

#### Step A6e Add MonsterImageFrame With Broken Image Fallback

- [] Create `frontend/src/components/monsters/MonsterImageFrame.tsx`.
- [] Wraps a Next.js `<Image>` or `<img>` with error handling.
- [] On image load error, renders a placeholder illustration or icon.
- [] Used in both `MonsterCard` and the detail page.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [] Gallery works logged in with fake/seeded monsters.
- [] Logged-out gallery shows polished CTA shell or redirect behavior, whichever the project chose.
- [] Detail page loads.
- [] Empty state is not ugly.
- [] Mobile grid has no horizontal overflow.

### Step A7 Add Email When Done UI Copy And Toggle Shell

branch: image-gen-ui-flow

Purpose:

Add UI affordance without overpromising durable behavior.

#### Step A7a Add should_email_when_done Toggle Auth-Gated

- [] Add a `Checkbox` or `Switch` (ShadCN) below the form submit button labeled "Email me when done".
- [] Only render the toggle when the user is authenticated.
- [] Include the `should_email_when_done` boolean in the form schema and submit payload.
- [] Do not add an email address input field — account email is used on the backend.

#### Step A7b Wire Conservative Keep-Tab-Open Copy

- [] In `GenerationProgressCard`, use the conservative copy:
  ```
  Image generation can take up to a minute. Keep this tab open while your monster is being generated.
  ```
- [] Do not add "you can leave this page" until Phase 5 when durable jobs exist.
- [] After Phase 5, this copy will be updated to reflect page-leave safety.

#### Step A7c Guard Anonymous Users From Arbitrary Email Input

- [] Confirm the toggle is hidden for logged-out users.
- [] Confirm the form schema does not allow an arbitrary `email` field from the client.
- [] The backend should derive the notification email from the authenticated user's account.

Copy before durable jobs:

```txt
Image generation can take up to a minute. Keep this tab open while your monster is being generated.
```

Copy after durable jobs:

```txt
Image generation can take up to a minute. You can leave this page and we can email you when it is done.
```

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [] UI does not lie about tab-close durability.
- [] Anonymous users cannot enter arbitrary email addresses.
- [] Toggle state is typed and validated.

### Step A8 Add Frontend Automated Tests

branch: image-gen-ui-flow

Purpose:

Make the fake UI flow safe to iterate.

#### Step A8a Form Validation Tests

- [] Test that submitting an empty form shows required field errors.
- [] Test that a valid form calls the `onSubmit` callback.
- [] Test that `name_seed` is required.
- [] Test that `element` is required.

#### Step A8b State Machine Transition Tests

- [] Use the state machine/reducer directly (no component rendering needed).
- [] Test each transition listed in Step A3c.
- [] Test that impossible transitions (e.g. `idle` → `succeeded` without going through `submitting`) are either rejected or not exposed.

#### Step A8c Create Page Happy Path And Error/Blocked Tests

- [] Render the `/create` page with a mocked `onSubmit` that returns a fake succeeded result.
- [] Confirm the success state renders.
- [] Render with a mocked `onSubmit` that returns a failed result; confirm error UI renders.
- [] Render with a mocked `onSubmit` that returns a blocked result; confirm blocked UI renders.
- [] Mock all server calls — no real Next route or Django calls in these tests.

#### Step A8d Gallery Render And Empty State Tests

- [] Render `GalleryGrid` with fixture data and confirm cards render.
- [] Render `EmptyGalleryState` and confirm CTA link points to `/create`.
- [] Render `MonsterCard` with a missing image and confirm the fallback renders.

#### Step A8e Email Toggle Visibility Test

- [] Render the form as a logged-in user; confirm the email toggle is visible.
- [] Render the form as a logged-out user; confirm the email toggle is not visible.

No real external calls.

Verification:

```bash
cd frontend
npm test -- --run
npm run lint
npx tsc --noEmit
```

Success criteria:

- [] Tests are deterministic.
- [] Tests mock server calls.
- [] Tests do not call real provider.
- [] Tests do not call real Supabase Storage.

### Step A9 Branch A Local Verification

IMPORTANT: I forgot to add a step for Sentry logging; remind me of that if I tell you to do A9 and we haven't done sentry stuff yet.

branch: image-gen-ui-flow

Purpose:

Prove frontend fake flow works before merge.

Commands:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Manual checks:

- [] `/create` works locally.
- [] Fake submit works.
- [] Loading, error, blocked, and success states can be seen.
- [] `/gallery` works locally.
- [] `/gallery/[monsterId]` works locally.
- [] Light/dark mode checked.
- [] Mobile/tablet/desktop checked.
- [] No real provider call occurs.

### Step A10 Branch A Merge And Production Verification

branch: image-gen-ui-flow

Purpose:

Merge UI fake flow safely.

Actions:

- [] Merge branch into main after Phase 0 is already merged.
- [] Deploy Vercel.
- [] Confirm backend is compatible.
- [] Keep fake mode enabled.
- [] Verify production UI.

Production checks:

- [] Production `/create` loads.
- [] Production `/gallery` loads.
- [] Fake mode still avoids paid calls.
- [] Production frontend still calls production backend where expected.
- [] No obvious console errors.
- [] No Sentry spam.

### Step A10 Documentation Pass

- Check in about best practices here
  [] Relevant documentation but don't overdo it

---

## Phase 2 Parallel Branch B Server Pipeline

This runs in parallel with Phase 1 and the two will be merged.

### Step B1 Add Server Environment Validation

branch: image-gen-server-pipeline

Purpose:

Validate server-only settings safely.

#### Step B1a Add Generation Mode Env Var And Validation

- [x] Add `IMAGE_GENERATION_MODE` env var with allowed values `fake` | `real`.
- [x] Default to `fake` in all environments unless explicitly set.
- [x] Validate at server startup (e.g. in a `lib/env/server.ts` module using `zod`).
- [x] Throw a startup error if the value is unrecognized.

#### Step B1b Add Provider Key Validation Real Mode Only

- [x] Add `OPENAI_API_KEY` (or equivalent) to server-only env validation.
- [x] Make this field required only when `IMAGE_GENERATION_MODE=real`.
- [x] In fake mode, the key is optional — do not error if absent.
- [x] Ensure the var name does NOT start with `NEXT_PUBLIC_`.

#### Step B1c Add Storage Bucket Env Validation

- [x] Add `SUPABASE_STORAGE_BUCKET` (or equivalent) to server-only env validation.
- [x] Add `SUPABASE_SECRET_KEY` to server-only env validation.
- [x] Ensure neither starts with `NEXT_PUBLIC_`.
- [x] In fake mode, these can be optional or have dummy defaults.

#### Step B1d Add Server-Side Size And Quality Constants

- [x] Define allowed image sizes (e.g. `['1024x1024']`) as a server-side constant.
- [x] Define allowed quality levels if the provider supports them.
- [x] Define the default model name as a server-side constant.
- [x] Never let the client choose these values.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [] Fake mode works without provider API key.
- [] Real mode fails fast without provider API key.
- [] No provider key is exposed client-side.
- [] Tests can override env safely.

### Step B2 Add Provider Abstractions

branch: image-gen-server-pipeline

Purpose:

Keep provider code injectable and testable.

#### Step B2a Define ImageProvider Interface

- [x] Create `frontend/src/lib/imageGeneration/providersType.ts`.
- [x] Define `ImageProviderResult` discriminated union:
  - `{ outcome: 'success', imageBytes: Buffer, mimeType: string }`
  - `{ outcome: 'failed', safeErrorMessage: string }`
- [x] Define `ImageProvider` interface with a single `generate(prompt: string): Promise<ImageProviderResult>` method.

#### Step B2b Implement FakeImageProvider

- [x] Create `frontend/src/lib/imageGeneration/fakeProviderType.ts`.
- [x] `FakeImageProvider.generate()` returns a small fixture image (e.g. a tiny hardcoded PNG buffer or a URL-based fixture).
- [x] Add a `shouldFail` option so tests can force the failure path.
- [x] Never imports or references the real provider SDK.

#### Step B2c Add VercelAIGatewayImageProvider Shell

- [x] Create `frontend/src/lib/imageGeneration/openAI_Provider.ts`.
- [x] Export a class or object implementing `ImageProvider`.
- [x] For now, `generate()` throws `new Error('Real provider not implemented yet')` or returns a failed result.
- [x] This will be filled in during Phase 4 Step 18.

#### Step B2d Normalize Provider Output And Errors

- [x] Confirm the `ImageProviderResult` union covers all cases the route needs to handle.
      <<<<<<< HEAD
- [x] # Add a `getImageProvider()` factory function in `providers.ts` that returns `FakeImageProvider` or `VercelAIGatewayImageProvider` based on `IMAGE_GENERATION_MODE`.
- [x] Add a `getImageProvider()` factory function in `providers.ts` that returns `FakeImageProvider` or `OpenAIImageProvider` based on `IMAGE_GENERATION_MODE`.
  > > > > > > > 5f9317d1c133442ad8fc4a468cb14a287648ac68
- [x] Import only through the factory — do not import providers directly in the route handler.

Provider result should broadly distinguish:

```txt
success
failed
```

Blocked belongs to moderation unless provider itself blocks.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [x] Fake provider returns realistic image bytes or fixture metadata.
- [x] Provider failures are typed.
- [x] Route code can depend on abstraction.
- [x] No real API call in tests.

### Step B3 Add Moderation Abstraction

branch: image-gen-server-pipeline

Purpose:

Prepare for free moderation call before real generation while keeping tests offline.

#### Step B3a Define ModerationProvider Interface

<<<<<<< HEAD

- [x] Create `frontend/src/lib/imageGeneration/moderation/moderation.ts`.
- [x] # Define `ModerationResult` discriminated union:
- [] Create `frontend/src/lib/imageGeneration/moderation.ts`.
- [] Define `ModerationResult` discriminated union:
  > > > > > > > 5f9317d1c133442ad8fc4a468cb14a287648ac68
  - `{ outcome: 'allowed' }`
  - `{ outcome: 'blocked', safeReason: string }`
  - `{ outcome: 'failed', safeErrorMessage: string }`
- [x] Define `ModerationProvider` interface with `moderate(text: string): Promise<ModerationResult>`.

#### Step B3b Implement FakeModerationProvider

- [x] `FakeModerationProvider.moderate()` returns `{ outcome: 'allowed' }` by default.
- [x] Add a `shouldBlock` option so tests can force the blocked path.
- [x] Never imports the real moderation SDK.

#### Step B3c Add Local Banned-Term Guard

- [x] Add a small `containsBannedTerms(text: string): boolean` utility.
- [x] Include a short list of obviously blocked terms (franchise names, slurs, etc.).
- [x] Run this check before calling the moderation provider — it is free and synchronous.
- [x] Keep the list in a server-only location; do not expose it client-side.

#### Step B3d Add Real Moderation Shell For Phase 4

- [x] Create an `OpenAIModerationProvider` class in `moderation.ts`.
- [x] For now, `moderate()` throws `new Error('Real moderation not implemented yet')` or returns `{ outcome: 'failed', ... }`.
- [x] Will be filled in during Phase 4 Step 19.

#### Step B3e Ensure Blocked Result Short-Circuits Image Generation

- [x] In the route orchestration (Step B5), the blocked path must return before calling the image provider.
- [x] Write a comment or assertion at the branch point to make this obvious.
- [x] Add a test in Step B7 proving a blocked moderation result never reaches the provider.
- [x] Add local banned-term/franchise guard separately from provider moderation.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [x] Fake moderation can allow.
- [x] Fake moderation can block.
- [x] Blocked moderation path never calls image provider.
- [x] Tests prove no real moderation call occurs.

### Step B4 Add Supabase Storage Abstraction

branch: image-gen-server-pipeline

Purpose:

Upload generated images from server-side code while keeping tests fake.

#### Step B4a Define ImageStorage Interface

<<<<<<< HEAD

- [x] Create `frontend/src/lib/imageGeneration/storage/storage.ts`.
- [x] # Define `ImageStorageResult` discriminated union:
- [] Create `frontend/src/lib/imageGeneration/storage.ts`.
- [] Define `ImageStorageResult` discriminated union:
  > > > > > > > 5f9317d1c133442ad8fc4a468cb14a287648ac68
  - `{ outcome: 'success', public_image_url: string, image_storage_path: string }`
  - `{ outcome: 'failed', safeErrorMessage: string }`
- [x] Define `ImageStorage` interface with `upload(imageBytes: Buffer, options: UploadOptions): Promise<ImageStorageResult>`.
- [x] `UploadOptions` includes `user_profile_id`, `monster_id`, `monster_image_id`, `mimeType`.

#### Step B4b Implement FakeImageStorage

- [x] `FakeImageStorage.upload()` returns a stable fake `public_image_url` (e.g. a known fixture image URL) and a deterministic `image_storage_path`.
- [x] Add a `shouldFail` option for tests.
- [x] Never imports or calls Supabase SDK.

#### Step B4c Build Storage Path Helper

- [x] Create a `buildStoragePath(user_profile_id, monster_id, monster_image_id, ext)` pure function.
- [x] Returns a path like `monster-images/{user_profile_id}/{monster_id}/{monster_image_id}.png`.
- [x] Test this function in isolation — it is a pure string function.

#### Step B4d Add Supabase Server-Side Storage Implementation

- [x] Create a `SupabaseImageStorage` class.
- [x] Uses the Supabase service role client (server-only).
- [x] Calls `supabase.storage.from(bucket).upload(path, imageBytes, { contentType: mimeType })`.
- [x] Retrieves the public URL with `supabase.storage.from(bucket).getPublicUrl(path)`.
- [x] Returns the `ImageStorageResult` union.
- [x] Do not instantiate or import this class in any Client Component.

#### Step B4e Validate MIME Type And Extension

- [x] Before uploading, confirm `mimeType` is one of `['image/png', 'image/jpeg', 'image/webp']`.
- [x] Derive the file extension from the MIME type — do not trust the provider to set a correct extension.
- [x] Return a failed result (not a thrown error) if the MIME type is invalid.

Recommended path shape:

```txt
monster-images/{user_profile_id}/{monster_id}/{monster_image_id}.png
```

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [x] Fake storage returns stable public URL/path.
- [x] Storage path is deterministic enough to test.
- [x] Supabase service role key is server-only.
- [x] No client component imports storage helper.

### Step B5 Add Next Server Route For Generation

branch: image-gen-server-pipeline

Purpose:

Add the server-side orchestration route.

Target endpoint:

```txt
POST /api/monsters/[monsterID]/generate-image
```

#### Step B5a Create POST /api/monsters/[monsterID]/generate-image Route File

- [x] Create `frontend/src/app/api/monsters/[monsterID]/generate-image/route.ts`.
- [x] Export only a `POST` handler.
- [x] Use `import 'server-only'` or equivalent

#### Step B5b Add Zod Request Schema And Validation

<<<<<<< HEAD

- Get monster form request schema; I think what we need is in monsterFormSchema.ts
- Validate it again on the server side, even if we have client-side validation, to ensure the contract is enforced and to prevent bad data from reaching the backend.
- [x] In the route handler, parse `await request.json()` with the schema.
- [x] # Return a typed 400 error if validation fails — use the project's standard error shape.
- [] Create `frontend/src/lib/imageGeneration/routeSchemas.ts`.
- [] Define `generateMonsterRequestSchema` matching the form fields from Step A2a.
- [] In the route handler, parse `await request.json()` with the schema.
- [] Return a typed 400 error if validation fails — use the project's standard error shape.
  > > > > > > > 5f9317d1c133442ad8fc4a468cb14a287648ac68

#### Step B5c Extract And Verify User Session Server-Side

- [x] Use the existing Supabase server client pattern to get the current user.
- [x] If the user is not authenticated and generation requires auth, return 401.
- [x] If anonymous generation is allowed in fake mode, note that explicitly and add a comment.

#### Step B5d Wire Full Orchestration Flow

<<<<<<< HEAD

- NOTE the Monster should already exist. If it doesn't exist, go back through our flow and make sure it exists before this step.
- [x] Call Django `POST /api/imageGeneration-jobs/` to create a job (QUEUED).
- [x] Run the banned-term guard from Step B3c.
- [x] Call `getModerationProvider().moderate(prompt)`.
- [x] If blocked: call Django mark-blocked endpoint; return blocked response.
- [x] Call Django mark-running endpoint (or transition in a combined create+run endpoint).
- [x] Call `getImageProvider().generate(prompt)`.
- [x] If provider failed: call Django mark-failed endpoint; return failed response.
- [x] Call `getImageStorage().upload(imageBytes, options)`.
- [x] If storage failed: call Django mark-failed endpoint; return failed response.
- [x] Call Django to make the MonsterImage, attached to the monster (obviously), with the storage URL and metadata etc.
- [x] Call Django mark-succeeded endpoint.
- [x] Return validated, normalized response. We have a zod schema for this

More principles:

- [x] Do not rely on the browser staying open after the request starts.
- [x] Django job status and MonsterImage records are the source of truth.
- [x] If the user closes the tab before receiving the response, the completed image should still be discoverable. It should be attached to the Monster in the db; make sure that happens.
- [x] # If the client never receives the final response, the successful job can still be recovered from Django state.
- [] Call Django `POST /api/imageGeneration-jobs/` to create a job (QUEUED).
- [] Call Django mark-running endpoint (or transition in a combined create+run endpoint).
- [] Run the banned-term guard from Step B3c.
- [] Call `getModerationProvider().moderate(prompt)`.
- [] If blocked: call Django mark-blocked endpoint; return blocked response.
- [] Call `getImageProvider().generate(prompt)`.
- [] If provider failed: call Django mark-failed endpoint; return failed response.
- [] Call `getImageStorage().upload(imageBytes, options)`.
- [] If storage failed: call Django mark-failed endpoint; return failed response.
- [] Call Django to create `MonsterImage` and `Monster` (or use a combined endpoint).
- [] Call Django mark-succeeded endpoint.
- [] Return validated, normalized response. We have a zod schema for this
  > > > > > > > 5f9317d1c133442ad8fc4a468cb14a287648ac68

#### Step B5e Add Normalized Error Response Shapes

- [x] Define a `GenerationRouteError` type: `{ error: string, errorCode: string }`.
- [x] Use consistent HTTP status codes: 400 for validation, 401 for auth, 422 for blocked, 500 for provider/storage failures.
- [x] Do not expose raw provider errors or stack traces in the response body.
- Note we have a NextApiError type which should override any above instructions if they conflict, I'm too lazy to look it up

#### Step B5f Add Sanitized Sentry Captures

- [x] Capture `generation job failed` with tags `{ generation_mode, error_code }` — no prompt, no image bytes.
- [x] Capture `provider failed` and `storage upload failed` similarly.
- [x] Do not call `Sentry.captureException` for expected/handled blocked prompts.
- [x] Confirm `Sentry.captureEvent` or structured logging is used, not just raw exception capture.

#### Step B5g Add Route Tests For Each Path

- [x] Test that an invalid request returns a 400 with the expected error shape.
- [x] Test that a valid request with allowed content goes through the happy path and returns the expected success response.
- [x] Test that a request with blocked content returns a 422 and calls the mark-blocked endpoint.
- [x] Test that a provider failure returns a 500 and calls the mark-failed endpoint without calling storage.
- [x] Test that a storage failure returns a 500 and calls the mark-failed endpoint.
- [x] Etc; test anything else that makes sense. Valid data, invalid data, etc etc

#### Step B5h Documentation

- [x] Document the endpiont in the frontend README
- [x] Docstrings, and comments at the top of the route file, and comments in the file explaining anything that needs to be explained
- In all docs, make it clear that this is how you make a MonsterImage. There's not a separate /api/monster-images/ endpoint or anything like that; this is the way to do it. You generate the image first, then create the MonsterImage with it.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [x] Invalid request returns project-standard error.
- [x] Fake happy path works.
- [x] Moderation blocked path works.
- [x] Provider failed path works.
- [x] Storage failed path works.
- [x] Django failed path works.
- [x] No real external calls in tests.

### Step B6 Add Django Job Update Endpoints For Trusted Server Flow

branch: image-gen-server-pipeline

Purpose:

Let Next server route update Django job state safely.

This step may require extra design.

Do not rush this if auth/trust boundaries are unclear.

#### Step B6a Document And Decide Trust Boundary Approach

- [x] Review the three options:
  1. Next forwards the user's Supabase access token to Django (user-authenticated).
  2. Next uses a server-to-server secret and sends job/user context (server-authenticated).
  3. Both: user token for ownership, server secret for sensitive transitions.
- [x] Write the chosen approach in a comment at the top of the transition views file.
- [x] Recommendation: use the user token for ownership checks and a server-only `NEXT_SERVER_SECRET` header for the state-mutation endpoints.

#### Step B6b Add Or Refine Job Transition Endpoints

<<<<<<< HEAD

- [x] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-running/`.
- [x] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-succeeded/`.
- [x] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-failed/`.
- [x] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-blocked/`.
- [x] Each endpoint calls the corresponding service function from Step 3.
- [x] # Each endpoint regenerates the full job serializer response.
- [] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-running/`.
- [] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-succeeded/`.
- [] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-failed/`.
- [] Implement `POST /api/imageGeneration-jobs/{job_id}/mark-blocked/`.
- [] Each endpoint calls the corresponding service function from Step 3.
- [] Each endpoint regenerates the full job serializer response.
  > > > > > > > 5f9317d1c133442ad8fc4a468cb14a287648ac68

#### Step B6c Add Auth And Server Secret Checks

- [x] Check `NEXT_SERVER_SECRET` header matches a server env var before allowing state mutation.
- [x] Also verify the job belongs to the authenticated user from the Supabase token.
- [x] Return 403 if either check fails.
- [x] Add `NEXT_SERVER_SECRET` to backend environment and document it.

#### Step B6d Add Tests For Unauthorized Transition Attempts

- [x] Test that a valid user cannot call `mark-succeeded` without the server secret header.
- [x] Test that a valid server secret cannot mark another user's job.
- [x] Test that the correct transition succeeds with both checks passing.

Verification:

```bash
cd backend
python manage.py test apps.monsters
python manage.py spectacular --file openapi.yaml

cd ../frontend
npm run generate:api
npx tsc --noEmit
```

Success criteria:

- [x] User cannot mutate another user's job.
- [x] Client cannot fake successful image generation without the intended server flow.
- [x] OpenAPI/generation types stay aligned.
- [x] Tests cover bad actor attempts.

### Step B7 Add Server Pipeline Tests

branch: image-gen-server-pipeline

Purpose:

Test orchestration without external calls.

#### Step B7a Route Request Validation Tests

- [x] Test that missing required fields return 400 with a useful error.
- [x] Test that extra unexpected fields are stripped or rejected.
- [x] Test that an unauthenticated request returns 401 if auth is required.

#### Step B7b Fake Happy Path End-To-End Test

- [x] Mock Django client (job create, mark-running, mark-succeeded, image create).
- [x] Mock `FakeModerationProvider` to allow.
- [x] Mock `FakeImageProvider` to succeed.
- [x] Mock `FakeImageStorage` to succeed.
- [x] Assert the response shape matches the expected success DTO.
- [x] Assert all Django mock endpoints were called in order.

#### Step B7c Moderation Blocked And Provider Failure Tests

- [x] Test with `FakeModerationProvider(shouldBlock: true)`: assert mark-blocked is called and no provider call is made.
- [x] Test with `FakeImageProvider(shouldFail: true)`: assert mark-failed is called and no storage call is made.
- [x] Test banned-term guard: assert a prompt containing a banned term is blocked before moderation provider is called.

#### Step B7d Storage And Django Client Failure Tests

- [x] Test with `FakeImageStorage(shouldFail: true)`: assert mark-failed is called.
- [x] Test Django job-create failure: assert the route returns an error and does not proceed.
- [x] Test that no real provider call occurs in any of these tests.
- [x] Test that real mode fails fast if provider key is missing.

Verification:

```bash
cd frontend
npm test -- --run
npm run lint
npx tsc --noEmit
```

Success criteria:

- [x] Tests pass without network.
- [x] No OpenAI call.
- [x] No Supabase Storage call.
- [x] No email call.
- [x] No raw prompt/base64 in logs.

### Step B8 Branch B Local Verification

branch: image-gen-server-pipeline

Purpose:

Prove server pipeline works locally in fake mode.

Commands:

```bash
cd backend
python manage.py test
python manage.py spectacular --file openapi.yaml

cd ../frontend
npm run generate:api
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Manual checks:

- [x] Call `/api/monsters/[monsterID]/generate-image` in fake mode.
- [x] Confirm Django job row is created.
- [x] Confirm job transitions to succeeded/failed/blocked as expected.
- [x] Confirm fake storage path/public URL is saved.
- [x] Confirm admin shows job.
- [x] Confirm no paid call occurs.

### Step B9 Branch B Merge And Production Verification

branch: image-gen-server-pipeline

Purpose:

Merge fake server pipeline safely.

Actions:

- [] Merge branch after Phase 0.
- [] Keep production `IMAGE_GENERATION_MODE=fake`.
- [] Deploy Render if backend endpoints changed.
- [] Deploy Vercel if Next route changed.
- [] Run production fake generation once with your own account.

Production checks:

- [] Render deploy succeeds.
- [] Vercel deploy succeeds.
- [] Production fake route works.
- [] Django admin shows production fake job.
- [] Gallery/detail can see fake result if UI exists.
- [] No paid provider call occurs.
- [] Sentry does not contain raw prompt/base64/secrets.

### Step B10 Documentation Pass

---

## Phase 3 Integration In Fake Mode

### Step 13 Connect UI To Server Pipeline

branch: image-gen-integration-fake-mode

Purpose:

Connect Branch A UI and Branch B fake server route.

#### Step 13a Replace Fake Handler With Real Route Call

- [x] Replace the in-component fake `onSubmit` with a call to `POST /api/monsters/[monsterID]/generate-image`.
- [x] Use `fetch` or the existing project HTTP client.
- [x] Treat the response body as `unknown` before parsing.

#### Step 13b Parse Response With Zod And Map To UI State

- [x] Parse the successful response with `monsterImageGenerationJobSchema` (or a combined success response schema).
- [x] Map the parsed backend DTO to the `GenerationUIState` discriminated union from Step A3a.
- [x] Parse error responses with an error schema; map to `failed` or `blocked` UI state.
- [x] Never cast raw response to a generated type directly.

#### Step 13c Add Duplicate Submit Guard

- [x] Confirm the submit button is disabled while `status === 'submitting'`.
- [x] Confirm the form cannot be re-submitted while a request is in flight.
- [x] Test this behavior in an automated test.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Manual checks:

- [] `/create` calls real local Next route.
- [] Next route uses fake provider.
- [] Backend job appears in admin.
- [] UI shows success.
- [] UI shows failure when fake provider is forced to fail.
- [] UI shows blocked when fake moderation is forced to block.

### Step 14 Connect Gallery And Detail Pages To Django

branch: image-gen-integration-fake-mode

Purpose:

Read saved monsters from the real Django API.

#### Step 14a Wire Gallery Page To Django Monster List Endpoint

- [x] Replace fixture data in `/gallery` with a real fetch to `GET /api/monsters/`.
- [x] Use the existing Django server client or `fetch` with auth headers.
- [x] Parse the response with `z.array(monsterSchema)`.
- [x] Handle the loading/empty/error states with real data.

#### Step 14b Wire Detail Page To Django Monster Detail Endpoint

- [x] Replace fixture lookup in `/gallery/[monsterId]` with a real fetch to `GET /api/monsters/{monsterId}/`.
- [x] Parse the response with `monsterSchema`.
- [x] Return 404 if the Django endpoint returns 404.
- [x] Handle the case where the image is missing.

#### Step 14c Handle Loading Empty And Error States With Real Data

- [x] Confirm the loading skeleton shows while fetching.
- [x] Confirm the empty state shows when the user has no monsters.
- [x] Confirm a user cannot view another user's monster (Django returns 404, frontend handles gracefully).
- [x] Seed fake monsters via Django admin to test the happy path locally.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [x] Seed fake monsters in Django admin.
- [x] Log in locally.
- [x] Gallery shows seeded monsters.
- [x] Detail page shows selected monster.
- [x] User cannot see another user's private monsters.
- [x] Broken image fallback works.

### Step 15 Add Full Fake Lifecycle Test

branch: image-gen-integration-fake-mode

Purpose:

Test the whole fake generation lifecycle without UI and without external calls.

#### Step 15a Write Backend Full Lifecycle Integration Test

- [x] Test: create job → mark running → mark succeeded (with fake MonsterImage) → fetch job → assert final state.
- [x] Use Django test client with a real authenticated user.
- [x] Assert job `status === 'succeeded'` and `monster_image` is present in the response.
- [x] Assert no network call was made.

#### Step 15b Write Frontend Route Full Lifecycle Test

- [x] Test the Next route handler end-to-end with all dependencies mocked (FakeModerationProvider, FakeImageProvider, FakeImageStorage, mock Django client).
- [x] Assert the response body matches the expected success shape after Zod parsing.
- [x] Assert all orchestration steps were called in order.

#### Step 15c Add Blocked And Failed Lifecycle Tests

- [x] Backend: test job → running → blocked; assert `status === 'blocked'` and no image row.
- [x] Backend: test job → running → failed; assert `status === 'failed'` and no image row.
- [x] Frontend route: test moderation blocked path — assert response has 422 status and blocked shape.
- [x] Frontend route: test provider failed path — assert response has 500 status and failed shape.

Verification:

```bash
cd backend
python manage.py test

cd ../frontend
npm test -- --run
npm run lint
npx tsc --noEmit
```

Success criteria:

- [x] Lifecycle test passes.
- [x] No external calls.
- [x] Final state is valid.
- [x] Failure/blocked lifecycle tests also exist.

### Step 16 Integration Local Verification

branch: image-gen-integration-fake-mode

Purpose:

Prove end-to-end fake mode works locally.

Commands:

```bash
cd backend
python manage.py check
python manage.py test
python manage.py spectacular --file openapi.yaml

cd ../frontend
npm run generate:api
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Manual checks:

- [x] Log in locally.
- [x] Generate fake monster from `/create`.
- [x] Job appears in Django admin.
- [x] Monster appears in gallery.
- [x] Detail page works.
- [x] Delete/edit behavior works if implemented.
- [x] No paid provider call.
- [x] No browser console errors.

### Step 17 Integration Merge And Production Verification

branch: image-gen-integration-fake-mode

Purpose:

Merge the integrated fake feature.

Actions:

- [x] Merge to main.
- [x] Deploy backend and frontend.
- [x] Keep production fake mode.
- [x] Run one prod fake generation.
- [x] Inspect admin.
- [x] Inspect gallery/detail.

Production checks:

- [x] Production `/create` works.
- [x] Fake generation succeeds.
- [x] Production admin shows job/monster/image.
- [x] Production gallery shows monster.
- [x] Production detail page works.
- [x] No paid provider call occurs.
- [x] Sentry remains clean.

---

## Phase 4 Real Image Generation

VERY IMPORTANT: TODO: We need to build the actual prompt, including the prompt itself, request and response schemas, etc. I don't think we have a step for that.

### Step 18 Add Real Provider Implementation

branch: image-gen-real-provider

Purpose:

Add real image provider behind the existing provider interface.

#### Step 18a Install Provider SDK If Needed

- [] Check if the vercel AI sdk (just called `ai`) is already installed in `frontend/package.json`.
- [] If not, run `npm install openai` (or equivalent).
- [] Import the SDK only inside `vercelaigatewayimageprovider` — do not let it leak into shared modules.

#### Step 18b Implement VercelAIGatewayImageProvider Behind Interface

- [] Implement `generate(prompt: string): Promise<ImageProviderResult>` in `vercelAIGatewayImageProvider.ts`.
- [] Use the server-side constants for model, size, and quality from Step B1d.
- [] Decode image bytes safely from the API response (base64 or URL download).
- [] Return `{ outcome: 'success', imageBytes, mimeType }` on success.

#### Step 18c Add Timeout And Abort Behavior

- [] Set a reasonable timeout on the provider request (e.g. 90 seconds).
- [] Use an `AbortController` or the SDK's built-in timeout option.
- [] On timeout, return `{ outcome: 'failed', safeErrorMessage: 'Generation timed out.' }`.

#### Step 18d Normalize vercel AI sdk Errors Into Typed Provider Results

- [] Catch API errors and map them to `{ outcome: 'failed', safeErrorMessage }`.
- [] Do not expose raw OpenAI error messages to the client.
- [] Do not log the full raw error body (it may contain prompt content).
- [] Keep fake provider as default when `IMAGE_GENERATION_MODE !== 'real'`.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual real-call check:

- [] Run exactly one local real generation only after confirming env and cost.
- [] Confirm output is uploaded.
- [] Confirm job succeeds.
- [] Confirm image displays.

### Step 19 Add Real Moderation Implementation

branch: image-gen-real-provider

Purpose:

Call moderation before real generation.

#### Step 19a Implement Real OpenAI Moderation Call

- [] Implement `moderate(text: string): Promise<ModerationResult>` in `OpenAIModerationProvider`.
- [] Call the OpenAI Moderations API.
- [] If `results[0].flagged === true`, return `{ outcome: 'blocked', safeReason: 'Prompt was flagged.' }`.
- [] Do not expose the raw categories or scores to the client.

#### Step 19b Integrate Into Route Before Image Generation

- [] Confirm moderation is called after the banned-term guard and before the image provider call.
- [] The order in `route.ts` should be: validate → banned-term guard → moderation provider → image provider.
- [] Add a comment at each branch point making this order explicit.

#### Step 19c Normalize Blocked Response Into ModerationResult

- [] On any OpenAI API error during moderation, return `{ outcome: 'failed', safeErrorMessage: 'Moderation check failed.' }` rather than throwing.
- [] A moderation failure should cause the generation job to fail (not silently allow).
- [] Fake mode: `FakeModerationProvider` is still used — real moderation is only active when `IMAGE_GENERATION_MODE=real`.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [] Allowed prompt proceeds.
- [] Obviously blocked local banned-term prompt stops before provider call.
- [] Moderation failure becomes recoverable error.
- [] No raw moderation response is exposed to the client.

### Step 20 Add Cost And Abuse Guards

branch: image-gen-real-provider

Purpose:

Prevent accidental spend.

#### Step 20a Add Per-User Generation Limit In Django

- [] Add a check in the job-create endpoint: count `MonsterImageGenerationJob` rows for the user in the last 24 hours.
- [] If count exceeds a configurable `MAX_GENERATIONS_PER_DAY` setting (default: 6), return 429 with a user-friendly message.
- [] Add `MAX_GENERATIONS_PER_DAY` to `settings.py` with a safe default, probably 6.
- [] Test the limit in `test_monster_api.py`.

#### Step 20b Enforce Auth Requirement For Real Generation

- [] In the Next route handler, if `IMAGE_GENERATION_MODE=real` and the user is not authenticated, return 401.
- [] Do not allow anonymous real generation under any circumstances without a deliberate rate-limited design.

#### Step 20c Add Server-Side Model Quality And Size Allowlist

- [] Confirm the server constants from Step B1d are still in use.
- [] Add an explicit assertion or check at the top of `VercelAIGatewayImageProvider.generate()` that the model/size/quality are from the allowlist.
- [] Return a failed result if they are not — this is a defense-in-depth check.

#### Step 20d Add Structured Sentry Event For Limit Hits

- [] When the per-user limit is hit, capture a structured Sentry event (not an exception) with tags `{ user_id_hash, limit }` — no raw user IDs.
- [] This makes it easy to spot abuse patterns without capturing PII.

Verification:

```bash
cd backend
python manage.py test

cd ../frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [] Anonymous real generation is blocked.
- [] Logged-in generation respects limit.
- [] Client cannot choose expensive arbitrary model.
- [] Tests cover limit behavior.
- [] Limit errors are user-friendly.

### Step 21 Add Real Storage Upload Path

branch: image-gen-real-provider

Purpose:

Store real generated image files in Supabase Storage.

#### Step 21a Confirm Supabase Bucket Exists And Is Public

- [] Log into Supabase dashboard and confirm the `monster-images` bucket (or equivalent) exists.
- [] Confirm the bucket is set to public.
- [] Note the bucket name and confirm it matches the `SUPABASE_STORAGE_BUCKET` env var.

#### Step 21b Wire Image Bytes Upload From Server Route

- [] Confirm `SupabaseImageStorage.upload()` from Step B4d is wired into the route handler via `getImageStorage()`.
- [] Confirm `FakeImageStorage` is still used in fake mode.
- [] Run one local real upload test (only if cost is confirmed acceptable).

#### Step 21c Save Public URL And Storage Path In Django

- [] Confirm the `mark-succeeded` endpoint accepts the `public_image_url` and `image_storage_path` from the Next server route.
- [] Confirm these are saved on the `MonsterImage` row.
- [] Confirm Django admin shows the image preview for real uploaded images.

#### Step 21d Document Orphan Cleanup Procedure

- [] Write a comment or note describing what happens if Supabase upload succeeds but the Django save fails.
- [] For now, the orphaned Supabase object is acceptable (manual cleanup).
- [] Note that Step 28 will add automated cleanup — do not build it here.

Verification:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Manual checks:

- [] Real image object appears in Supabase Storage.
- [] Public URL loads in browser.
- [] Django stores storage path.
- [] Django admin preview works.
- [] Gallery image loads.

### Step 22 Real Image Generation Local Verification

branch: image-gen-real-provider

Purpose:

Run controlled local verification.

Commands:

```bash
cd backend
python manage.py check
python manage.py test
python manage.py spectacular --file openapi.yaml

cd ../frontend
npm run generate:api
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Manual checks:

- [] Fake mode still works.
- [] Real mode works with one deliberate test.
- [] Real mode blocked prompt does not call image provider.
- [] Real mode stores image.
- [] Gallery shows real image.
- [] Sentry captures no sensitive data.
- [] Cost guard works.

### Step 23 Real Image Generation Merge And Production Verification

branch: image-gen-real-provider

Purpose:

Enable real generation carefully in production.

Actions:

- [] Merge to main.
- [] Deploy backend and frontend.
- [] Keep production fake mode for first deploy.
- [] Verify fake mode in production.
- [] Add provider env vars in Vercel only when ready.
- [] Flip production real mode only intentionally.
- [] Run exactly one production real generation.
- [] Flip back to fake if anything looks wrong.

Production checks:

- [] Vercel has provider key as server-only env var.
- [] No provider key is public.
- [] One real generation succeeds.
- [] Supabase Storage contains image.
- [] Django admin shows job.
- [] Gallery shows image.
- [] Sentry has sanitized event only.
- [] Rate limit/cost guard is active.

### Step 24 Documentation Pass

- Document the broad data flow and lifecycle of a generation job in a README or project docs.
- Document the provider, moderation, and storage abstractions and how to implement new ones.

---

## Phase 5 Durable Jobs And Email Notifications

### Step 24 Design Durable Execution Before Implementation

branch: image-gen-durable-jobs

Purpose:

Do not fake durable async.

This phase needs design before implementation.

#### Step 24a Evaluate Execution Mechanism Options

- [] Review Vercel Workflows: assess cost, cold-start behavior, and whether it fits the current Vercel tier.
- [] Review Render background worker: assess whether a separate worker process is acceptable infra overhead.
- [] Review keeping sync-only: assess whether the generation time (< 60 seconds) is acceptable for users who must keep the tab open.
- [] Do not add Celery/Redis unless the infra tradeoff is clearly accepted and documented.

#### Step 24b Document Idempotency And Retry Strategy

- [] Define what "retry" means for a generation job: is it a new job, or does the same job row get retried?
- [] Define idempotency key strategy to prevent duplicate monster/image rows on retry.
- [] Write this down — it must be decided before implementing durable execution.

#### Step 24c Document Email Trigger And Deduplication Behavior

- [] Define when the email is sent: on terminal job state transition only.
- [] Define deduplication: if `notified_at` is already set, do not send again.
- [] Define error handling: if send fails, store the error in `notification_error`; do not corrupt the job.

#### Step 24d Write Decision Before Any Implementation Begins

- [] Write the chosen execution mechanism, idempotency strategy, and email behavior in a short decision note (inline in this doc or in a project notes file).
- [] Do not write any durable execution code until this decision is written and agreed.

### Step 25 Implement Email When Done Only After Durability Exists

branch: image-gen-durable-jobs

Purpose:

Make `should_email_when_done` real.

#### Step 25a Add Email Send Service Mocked In Tests

- [] Create a `send_generation_complete_email(job)` function in a backend email service module.
- [] Use Django's email backend (configurable per environment).
- [] Use the job owner's account email — do not accept arbitrary recipient.
- [] In tests, mock with `@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')`.

#### Step 25b Set notified_at And Store Send Errors

- [] After a successful send, set `job.notified_at = now()` and save.
- [] If the send raises an exception, catch it, store the error message in `job.notification_error`, and save — do not re-raise.
- [] The generation job should remain in `succeeded` state even if the email fails.

#### Step 25c Guard Against Duplicate Sends On Retry

- [] Before sending, check `if job.notified_at is not None: return` — skip silently.
- [] This is the idempotency guard for email.
- [] Test this: call the send function twice; confirm only one email is sent.

#### Step 25d Update UI Copy To Reflect Page-Leave Safety

- [] Update `GenerationProgressCard` copy to:
  ```
  Image generation can take up to a minute. You can leave this page and we will email you when your monster is done.
  ```
- [] Only update this copy after durable jobs are confirmed working in production.

Verification:

```bash
cd backend
python manage.py test

cd ../frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [] Email sending is mocked in tests.
- [] Email sends once.
- [] Failed email does not corrupt succeeded generation job.
- [] UI copy is accurate.

### Step 26 Durable Job Tests And Verification

branch: image-gen-durable-jobs

Purpose:

Prove durable lifecycle works.

#### Step 26a Add Retry Idempotency Tests

- [] Test that triggering the same job workflow twice does not create two `Monster` rows.
- [] Test that triggering the same job workflow twice does not create two `MonsterImage` rows.
- [] Use the idempotency key strategy from Step 24b.

#### Step 26b Add Duplicate Monster And Image Prevention Tests

- [] Test that a succeeded job cannot be transitioned to succeeded again.
- [] Test that `mark_job_succeeded()` called twice raises `InvalidJobTransition`.

#### Step 26c Add Email Deduplication Tests

- [] Test that `send_generation_complete_email()` sends exactly one email when called twice.
- [] Test that a failed email send does not change job status from `succeeded`.
- [] Test that `notification_error` is set when the send fails.

#### Step 26d Manual Production Durable Smoke Check

- [] Deploy durable version with fake provider.
- [] Start a fake generation job.
- [] Navigate away from the page.
- [] Confirm job completes in background.
- [] Confirm gallery shows result.
- [] Confirm email behavior if `should_email_when_done=true` and email is configured.

---

## Phase 6 Polish Hardening And Cleanup

### Step 27 Admin Hardening

branch: image-gen-polish-hardening

Purpose:

Make admin useful and safe.

#### Step 27a Improve List Displays Filters And Search

- [] Review `MonsterAdmin`, `MonsterImageAdmin`, and `MonsterImageGenerationJobAdmin` list pages.
- [] Add any missing useful columns.
- [] Add date hierarchy on `created_at` where useful.
- [] Confirm all `list_filter` values still work correctly.

#### Step 27b Add Image URL Preview Helper

- [] Confirm the `image_preview` helper from Step 6d is rendering cleanly in production.
- [] Add a max-width/max-height constraint on the thumbnail so it does not break the admin layout.
- [] Confirm the helper shows "(no image)" gracefully when the URL is null.

#### Step 27c Add Mark Primary Image Action

- [] Add a `mark_as_primary` admin action to `MonsterImageAdmin`.
- [] Sets `is_primary=True` on the selected image and `is_primary=False` on all other images for the same monster.
- [] Show a success message with the monster name.

#### Step 27d Add Hide Or Remove Image Metadata Action

- [] Add a `remove_image_metadata` admin action for moderation purposes.
- [] Clears `public_image_url` and `image_storage_path` from the selected `MonsterImage` rows.
- [] Does not delete the Supabase Storage object (that is Step 28).
- [] Requires confirmation — use a custom action with an intermediate confirmation page, or guard with a prominent warning message.

Verification:

```bash
cd backend
python manage.py check
python manage.py test apps.monsters
```

Manual checks:

- [] Admin list pages are readable.
- [] Filters work.
- [] Image previews do not crash.
- [] Dangerous actions are not easy to trigger accidentally.

### Step 28 Storage Cleanup Behavior

branch: image-gen-polish-hardening

Purpose:

Avoid orphaned images where practical.

#### Step 28a Decide And Document Delete Behavior

- [] Decide: when a `Monster` is deleted, should the Supabase Storage objects be deleted too?
- [] Recommendation: yes, delete storage objects on monster delete to avoid accumulating orphans.
- [] Decide: when a `MonsterImage` row is deleted directly, delete the storage object too.
- [] Write this decision in a comment in the service file.

#### Step 28b Add Storage Cleanup Service

- [] Create `backend/apps/monsters/services/storage_cleanup.py`.
- [] Add `delete_monster_image_storage(image_storage_path: str) -> None`.
- [] Call the Supabase storage client to remove the object at the given path.
- [] Log cleanup failures at WARNING level; do not raise unless the caller needs to know.

#### Step 28c Wire Cleanup To Monster Delete

- [] Override `Monster.delete()` or add a `post_delete` signal.
- [] For each `MonsterImage` belonging to the monster, call `delete_monster_image_storage()`.
- [] Override `MonsterImage.delete()` similarly for direct image deletion.
- [] In tests, mock the storage client so no real Supabase call is made.

#### Step 28d Add Cleanup Tests Success And Failure Paths

- [] Test that deleting a `Monster` calls cleanup for each of its images.
- [] Test that cleanup failure (storage client raises) does not prevent the DB row from being deleted.
- [] Test that cleanup is not called in fake mode if storage is mocked.

Verification:

```bash
cd backend
python manage.py test

cd ../frontend
npm run lint
npx tsc --noEmit
npm test -- --run
```

Success criteria:

- [] Delete behavior is documented.
- [] Tests cover successful cleanup.
- [] Tests cover cleanup failure.
- [] No real storage call in tests.

### Step 29 Sentry Review

branch: image-gen-polish-hardening

Purpose:

Make observability useful, not noisy.

#### Step 29a Audit Backend And Frontend Captures For Sensitive Data

- [] Review all `Sentry.captureException` and `Sentry.captureEvent` calls added during this feature.
- [] Confirm no raw prompts, base64 image data, access tokens, provider keys, or cookies are in any payload.
- [] Use `Sentry.withScope` to set tags without leaking context.

#### Step 29b Add Structured Tags To Useful Events

- [] Add `generation_mode` tag to all generation-related Sentry events.
- [] Add `provider` tag where applicable.
- [] Add `job_status` tag to job lifecycle events.
- [] Use these tags to filter Sentry issues effectively.

#### Step 29c Remove Noisy Expected-Error Captures

- [] Review for any `captureException` calls on expected/handled errors (e.g. blocked prompts, validation errors, 401s).
- [] Remove or downgrade these to breadcrumbs or structured events.
- [] Confirm `/health` pings are still filtered out of Sentry.
- [] Add breadcrumbs where useful.

Verification:

- [] Trigger fake provider failure locally.
- [] Trigger fake storage failure locally.
- [] Trigger blocked prompt locally.
- [] Inspect Sentry payloads.
- [] Confirm no sensitive data.
- [] Confirm events are useful.

### Step 30 Final Production QA

branch: image-gen-polish-hardening

Purpose:

Make the feature portfolio-ready.

#### Step 30a Run Full Command Suite Backend And Frontend

- [] Run all backend commands:
  ```bash
  cd backend
  python manage.py check
  python manage.py test
  python manage.py spectacular --file openapi.yaml
  ```
- [] Run all frontend commands:
  ```bash
  cd frontend
  npm run generate:api
  npm run lint
  npx tsc --noEmit
  npm test -- --run
  npm run build
  ```
- [] Fix any failures before proceeding to the manual checklist.

#### Step 30b Manual Production Walkthrough Checklist

- [] Landing page still loads and looks correct.
- [] Auth (login, logout, protected pages) still works.
- [] `/create` page loads.
- [] Fake generation completes and shows result.
- [] Real generation works if `IMAGE_GENERATION_MODE=real` is intentionally enabled.
- [] Gallery shows generated monsters.
- [] Detail page shows individual monster.
- [] Django admin loads and shows all new models.
- [] Seed fake monsters admin action works if `ENABLE_DEV_ADMIN_ACTIONS=true`.
- [] Mobile layout does not overflow on any page.
- [] Dark and light modes are both readable.
- [] No browser console errors.
- [] No unexpected Sentry events appear.
- [] No paid provider calls happen outside of an intentional real-mode test.

Production checks:

- [] Landing page still works.
- [] Auth still works.
- [] `/create` works.
- [] Fake generation works.
- [] Real generation works if intentionally enabled.
- [] Gallery works.
- [] Detail page works.
- [] Admin works.
- [] Seed fake monsters action works if intentionally enabled.
- [] Mobile works.
- [] Dark/light modes work.
- [] No console errors.
- [] No Sentry spam.
- [] No paid calls happen accidentally.

---

## Definition Of Done

The monster image generation feature is done when:

- [] Django models exist for monsters, images, and image generation jobs.
- [] Model constraints and transition services prevent impossible job states.
- [] Django admin can inspect monsters, images, and jobs.
- [] Admin/management command can seed fake monsters for selected users.
- [] OpenAPI schema includes all relevant DTOs/endpoints.
- [] Frontend generated types are updated.
- [] Manual Zod schemas exist and drift checks pass.
- [] Frontend UI state uses carefully hand-written discriminated unions.
- [] Backend DTO types and frontend UI state types are separate.
- [] `/create` has polished loading/success/error/blocked states.
- [] `/gallery` and detail views work.
- [] Fake mode works locally and in production.
- [] Tests do not call real providers, moderation, storage, or email.
- [] Real provider is server-only.
- [] Public generated images are okay for this app.
- [] Uploaded reference images, if added later, should be private by default.
- [] Do not log raw prompts by default.
- [] Do not log provider responses containing image data or base64.

---

## Known Design Questions To Revisit

These should be designed before implementation if they become blocking.

- [] Exact final discriminated union shapes for frontend generation UI state.
- [] Exact final backend job DTO shape if OpenAPI makes unions awkward.
- [] Whether job transition endpoints need user token only, server secret only, or both.
- [] Whether fake generation creates monster immediately or creates a job first and then a monster.
- [] Whether anonymous demo uses temporary frontend-only monsters or Django demo records.
- [] Whether production admin seeding remains enabled while unpublished.
- [] Whether durable execution uses Vercel Workflows, Render worker, or a simpler sync-only model.
- [] Whether `should_email_when_done` ships before or after durable async.
- [] Whether Download PFP is client canvas first or server-rendered image route first.
