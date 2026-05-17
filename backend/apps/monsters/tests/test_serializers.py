"""
Comprehensive serializer tests for all Monster, MonsterImage and MonsterImageGenerationJob
serializers.

"""

import uuid

from django.test import TestCase

from apps.accounts.models import UserProfile
from apps.monsters.models import (
    Monster,
    MonsterImage,
    MonsterImageGenerationJob,
    MonsterImageGenerationMode,
)
from apps.monsters.serializers import (
    MonsterCreateSerializer,
    MonsterImageGenerationJobCreateSerializer,
    MonsterImageGenerationJobNotificationUpdateSerializer,
    MonsterImageGenerationJobSerializer,
    MonsterImageSerializer,
    MonsterSerializer,
    MonsterTraitsSerializer,
    MonsterUpdateSerializer,
)
from apps.monsters.services.generation_jobs import (
    create_generation_job,
    mark_job_blocked,
    mark_job_failed,
    mark_job_running,
    mark_job_succeeded,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_profile(email: str = "test@example.com") -> UserProfile:
    return UserProfile.objects.create(supabase_user_id=uuid.uuid4(), email=email)


def _make_monster(owner: UserProfile, display_name: str = "Gloopbeast") -> Monster:
    return Monster.objects.create(
        owner=owner,
        display_name=display_name,
        element="fire",
        habitat="volcano",
        personality="grumpy",
        color_palette="red and black",
        flavor_text="Smells of sulphur.",
    )


def _make_monster_image(monster: Monster) -> MonsterImage:
    return MonsterImage.objects.create(
        monster=monster,
        public_image_url="https://placehold.co/512x512.png",
        image_storage_path="monsters/test.png",
        provider="fake",
        provider_model="fake-fixture-v1",
    )


def _make_queued_job(owner: UserProfile) -> MonsterImageGenerationJob:
    return create_generation_job(
        owner=owner,
        generation_mode=MonsterImageGenerationMode.FAKE,
        provider="fake",
        provider_model="fake-fixture-v1",
        sanitized_prompt="A grumpy fire goblin",
        prompt_version="v1",
        prompt_hash="abc123",
    )


class _MockRequest:
    """Minimal mock for DRF serializer context['request'].user."""

    def __init__(self, user: UserProfile):
        self.user = user


# ===========================================================================
# MonsterTraitsSerializer
# ===========================================================================


class MonsterTraitsSerializerTests(TestCase):

    def test_valid_data_passes(self):
        data = {
            "element": "fire",
            "habitat": "volcano",
            "personality": "grumpy",
            "color_palette": "red and black",
        }
        s = MonsterTraitsSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)

    def test_blank_element_rejected(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "   ",
                "habitat": "volcano",
                "personality": "grumpy",
                "color_palette": "red",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("element", s.errors)

    def test_blank_habitat_rejected(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "fire",
                "habitat": "",
                "personality": "grumpy",
                "color_palette": "red",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("habitat", s.errors)

    def test_blank_personality_rejected(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "fire",
                "habitat": "cave",
                "personality": "  ",
                "color_palette": "red",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("personality", s.errors)

    def test_blank_color_palette_rejected(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "fire",
                "habitat": "cave",
                "personality": "grumpy",
                "color_palette": "",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("color_palette", s.errors)

    def test_element_max_length_enforced(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "x" * 21,  # max_length=20
                "habitat": "cave",
                "personality": "grumpy",
                "color_palette": "red",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("element", s.errors)

    def test_element_at_max_length_is_accepted(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "x" * 20,
                "habitat": "cave",
                "personality": "grumpy",
                "color_palette": "red",
            }
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_habitat_max_length_enforced(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "fire",
                "habitat": "h" * 61,  # max_length=60
                "personality": "grumpy",
                "color_palette": "red",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("habitat", s.errors)

    def test_personality_max_length_enforced(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "fire",
                "habitat": "cave",
                "personality": "p" * 61,  # max_length=60
                "color_palette": "red",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("personality", s.errors)

    def test_color_palette_max_length_enforced(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "fire",
                "habitat": "cave",
                "personality": "grumpy",
                "color_palette": "c" * 81,  # max_length=80
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("color_palette", s.errors)

    def test_missing_field_rejected(self):
        s = MonsterTraitsSerializer(
            data={
                "element": "fire",
                "habitat": "cave",
                # personality missing
                "color_palette": "red",
            }
        )
        self.assertFalse(s.is_valid())
        self.assertIn("personality", s.errors)


# ===========================================================================
# MonsterSerializer (read)
# ===========================================================================


class MonsterSerializerTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()
        self.monster = _make_monster(self.owner)

    def test_id_present_in_output(self):
        data = MonsterSerializer(self.monster).data
        self.assertIn("id", data)
        self.assertEqual(str(data["id"]), str(self.monster.pk))

    def test_display_name_present_in_output(self):
        data = MonsterSerializer(self.monster).data
        self.assertEqual(data["display_name"], "Gloopbeast")

    def test_traits_nested_object_present(self):
        data = MonsterSerializer(self.monster).data
        self.assertIn("traits", data)
        traits = data["traits"]
        self.assertEqual(traits["element"], "fire")
        self.assertEqual(traits["habitat"], "volcano")
        self.assertEqual(traits["personality"], "grumpy")
        self.assertEqual(traits["color_palette"], "red and black")

    def test_flavor_text_present_in_output(self):
        data = MonsterSerializer(self.monster).data
        self.assertIn("flavor_text", data)

    def test_created_at_and_updated_at_present(self):
        data = MonsterSerializer(self.monster).data
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_owner_not_in_output(self):
        """owner must never appear as a writable field in the read serializer."""
        data = MonsterSerializer(self.monster).data
        self.assertNotIn("owner", data)
        self.assertNotIn("owner_id", data)

    def test_no_image_fields_in_output(self):
        data = MonsterSerializer(self.monster).data
        for field in ("public_image_url", "image_url", "image_storage_path"):
            self.assertNotIn(
                field,
                data,
                msg=f"Unexpected image field '{field}' in MonsterSerializer output",
            )

    def test_image_field_is_null_when_no_image(self):
        data = MonsterSerializer(self.monster).data
        self.assertIn("image", data)
        self.assertIsNone(data["image"])

    def test_no_generation_job_fields_in_output(self):
        data = MonsterSerializer(self.monster).data
        for field in (
            "status",
            "generation_mode",
            "error_code",
            "started_at",
            "finished_at",
        ):
            self.assertNotIn(
                field,
                data,
                msg=f"Unexpected job field '{field}' in MonsterSerializer output",
            )


# ===========================================================================
# MonsterCreateSerializer (write)
# ===========================================================================


class MonsterCreateSerializerTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def _valid_payload(self):
        return {
            "display_name": "Blorp",
            "traits": {
                "element": "fire",
                "habitat": "volcano",
                "personality": "grumpy",
                "color_palette": "red and orange",
            },
        }

    def test_valid_payload_passes_validation(self):
        s = MonsterCreateSerializer(
            data=self._valid_payload(),
            context={"request": _MockRequest(self.owner)},
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_create_stores_monster_in_db(self):
        s = MonsterCreateSerializer(
            data=self._valid_payload(),
            context={"request": _MockRequest(self.owner)},
        )
        s.is_valid(raise_exception=True)
        monster = s.save()
        self.assertTrue(Monster.objects.filter(pk=monster.pk).exists())

    def test_owner_set_from_request_context(self):
        s = MonsterCreateSerializer(
            data=self._valid_payload(),
            context={"request": _MockRequest(self.owner)},
        )
        s.is_valid(raise_exception=True)
        monster = s.save()
        self.assertEqual(monster.owner_id, self.owner.pk)

    def test_client_supplied_owner_field_is_ignored(self):
        """owner should NOT be an accepted input field."""
        payload = {**self._valid_payload(), "owner": str(uuid.uuid4())}
        s = MonsterCreateSerializer(
            data=payload,
            context={"request": _MockRequest(self.owner)},
        )
        s.is_valid(raise_exception=True)
        monster = s.save()
        # Owner must still be the authenticated user, not the fake UUID
        self.assertEqual(monster.owner_id, self.owner.pk)

    def test_missing_display_name_fails(self):
        payload = self._valid_payload()
        del payload["display_name"]
        s = MonsterCreateSerializer(
            data=payload,
            context={"request": _MockRequest(self.owner)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("display_name", s.errors)

    def test_missing_traits_fails(self):
        payload = self._valid_payload()
        del payload["traits"]
        s = MonsterCreateSerializer(
            data=payload,
            context={"request": _MockRequest(self.owner)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("traits", s.errors)

    def test_missing_element_in_traits_fails(self):
        payload = self._valid_payload()
        del payload["traits"]["element"]
        s = MonsterCreateSerializer(
            data=payload,
            context={"request": _MockRequest(self.owner)},
        )
        self.assertFalse(s.is_valid())

    def test_flavor_text_optional(self):
        payload = self._valid_payload()
        # No flavor_text in payload
        s = MonsterCreateSerializer(
            data=payload,
            context={"request": _MockRequest(self.owner)},
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_flavor_text_max_length_enforced(self):
        payload = {**self._valid_payload(), "flavor_text": "x" * 501}
        s = MonsterCreateSerializer(
            data=payload,
            context={"request": _MockRequest(self.owner)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("flavor_text", s.errors)

    def test_display_name_max_length_enforced(self):
        payload = {**self._valid_payload(), "display_name": "x" * 81}
        s = MonsterCreateSerializer(
            data=payload,
            context={"request": _MockRequest(self.owner)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("display_name", s.errors)


# ===========================================================================
# MonsterUpdateSerializer (write)
# ===========================================================================


class MonsterUpdateSerializerTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()
        self.monster = _make_monster(self.owner)

    def test_display_name_update_works(self):
        s = MonsterUpdateSerializer(
            self.monster,
            data={"display_name": "Updated Name"},
            partial=True,
        )
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()
        self.assertEqual(updated.display_name, "Updated Name")

    def test_traits_update_works(self):
        s = MonsterUpdateSerializer(
            self.monster,
            data={
                "traits": {
                    "element": "water",
                    "habitat": "ocean",
                    "personality": "calm",
                    "color_palette": "blue and silver",
                }
            },
            partial=True,
        )
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()
        self.assertEqual(updated.element, "water")
        self.assertEqual(updated.habitat, "ocean")

    def test_flavor_text_update_works(self):
        s = MonsterUpdateSerializer(
            self.monster,
            data={"flavor_text": "Updated flavor."},
            partial=True,
        )
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()
        self.assertEqual(updated.flavor_text, "Updated flavor.")

    def test_all_fields_optional_patch_semantics(self):
        """Empty payload is valid for a PATCH serializer."""
        s = MonsterUpdateSerializer(
            self.monster,
            data={},
            partial=True,
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_owner_field_not_in_serializer(self):
        """owner is not a field on MonsterUpdateSerializer."""
        s = MonsterUpdateSerializer()
        self.assertNotIn("owner", s.fields)

    def test_owner_field_not_accepted_as_input(self):
        """Supplying owner in payload does not change ownership."""
        other_owner = _make_profile("other@example.com")
        s = MonsterUpdateSerializer(
            self.monster,
            data={"owner": str(other_owner.pk)},
            partial=True,
        )
        s.is_valid()
        s.save()
        self.monster.refresh_from_db()
        self.assertEqual(self.monster.owner_id, self.owner.pk)


# ===========================================================================
# MonsterImageSerializer (read)
# ===========================================================================


class MonsterImageSerializerTests(TestCase):

    def setUp(self):
        owner = _make_profile()
        monster = _make_monster(owner)
        self.image = _make_monster_image(monster)

    def test_id_present(self):
        data = MonsterImageSerializer(self.image).data
        self.assertIn("id", data)

    def test_public_image_url_present(self):
        data = MonsterImageSerializer(self.image).data
        self.assertIn("public_image_url", data)
        self.assertEqual(data["public_image_url"], "https://placehold.co/512x512.png")

    def test_image_storage_path_present(self):
        """image_storage_path is intentionally included (Step 2e decision)."""
        data = MonsterImageSerializer(self.image).data
        self.assertIn("image_storage_path", data)

    def test_provider_present(self):
        data = MonsterImageSerializer(self.image).data
        self.assertIn("provider", data)

    def test_provider_model_present(self):
        data = MonsterImageSerializer(self.image).data
        self.assertIn("provider_model", data)

    def test_created_at_present(self):
        data = MonsterImageSerializer(self.image).data
        self.assertIn("created_at", data)

    def test_no_image_bytes_in_output(self):
        data = MonsterImageSerializer(self.image).data
        self.assertNotIn("image_bytes", data)
        self.assertNotIn("image_data", data)

    def test_no_base64_in_output(self):
        data = MonsterImageSerializer(self.image).data
        self.assertNotIn("base64", data)
        self.assertNotIn("image_base64", data)

    def test_no_raw_provider_response_in_output(self):
        data = MonsterImageSerializer(self.image).data
        self.assertNotIn("raw_provider_response", data)
        self.assertNotIn("provider_response", data)

    def test_no_is_primary_in_output(self):
        """is_primary was deferred in Step 2b."""
        data = MonsterImageSerializer(self.image).data
        self.assertNotIn("is_primary", data)


# ===========================================================================
# MonsterImageGenerationJobSerializer (read)
# ===========================================================================


class JobSerializerOutputTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()
        self.monster = _make_monster(self.owner)

    def _queued_job(self):
        return _make_queued_job(self.owner)

    def _running_job(self):
        job = _make_queued_job(self.owner)
        return mark_job_running(job)

    def _succeeded_job(self):
        job = self._running_job()
        image = _make_monster_image(self.monster)
        return mark_job_succeeded(job, image)

    def _failed_job(self):
        job = _make_queued_job(self.owner)
        return mark_job_failed(
            job, error_code="provider_timeout", safe_error_message="Timed out."
        )

    def _blocked_job(self):
        job = self._running_job()
        return mark_job_blocked(
            job, error_code="content_policy", safe_error_message="Blocked by policy."
        )

    # ── Top-level fields ─────────────────────────────────────────────────────

    def test_id_present(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("id", data)

    def test_status_present(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("status", data)
        self.assertEqual(data["status"], "queued")

    def test_generation_mode_present(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("generation_mode", data)

    def test_monster_field_present(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("monster", data)

    # ── sanitized_prompt must NOT be exposed ─────────────────────────────────

    def test_sanitized_prompt_not_in_output(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertNotIn("sanitized_prompt", data)

    def test_sanitized_prompt_not_in_generation_metadata(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("generation_metadata", data)
        self.assertNotIn("sanitized_prompt", data["generation_metadata"])

    # ── provider_info sub-object ─────────────────────────────────────────────

    def test_provider_info_sub_object_present(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("provider_info", data)
        pi = data["provider_info"]
        self.assertIn("provider", pi)
        self.assertIn("provider_model", pi)
        self.assertIn("provider_request_id", pi)

    def test_provider_info_values_correct(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertEqual(data["provider_info"]["provider"], "fake")
        self.assertEqual(data["provider_info"]["provider_model"], "fake-fixture-v1")

    # ── generation_metadata sub-object ──────────────────────────────────────

    def test_generation_metadata_has_prompt_version(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("prompt_version", data["generation_metadata"])

    def test_generation_metadata_has_prompt_hash(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("prompt_hash", data["generation_metadata"])

    # ── notify_when_done sub-object ──────────────────────────────────────────

    def test_notify_when_done_sub_object_present(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("notify_when_done", data)
        n = data["notify_when_done"]
        self.assertIn("should_email_when_done", n)
        self.assertIn("notified_at", n)
        self.assertIn("notification_error", n)

    # ── timestamps sub-object ────────────────────────────────────────────────

    def test_timestamps_sub_object_present(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIn("timestamps", data)
        ts = data["timestamps"]
        self.assertIn("started_at", ts)
        self.assertIn("finished_at", ts)
        self.assertIn("created_at", ts)
        self.assertIn("updated_at", ts)

    # ── error_info: null for non-error states ────────────────────────────────

    def test_error_info_null_for_queued(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIsNone(data["error_info"])

    def test_error_info_null_for_running(self):
        data = MonsterImageGenerationJobSerializer(self._running_job()).data
        self.assertIsNone(data["error_info"])

    def test_error_info_null_for_succeeded(self):
        data = MonsterImageGenerationJobSerializer(self._succeeded_job()).data
        self.assertIsNone(data["error_info"])

    def test_error_info_present_for_failed(self):
        data = MonsterImageGenerationJobSerializer(self._failed_job()).data
        self.assertIsNotNone(data["error_info"])
        self.assertEqual(data["error_info"]["code"], "provider_timeout")
        self.assertEqual(data["error_info"]["message"], "Timed out.")

    def test_error_info_present_for_blocked(self):
        data = MonsterImageGenerationJobSerializer(self._blocked_job()).data
        self.assertIsNotNone(data["error_info"])
        self.assertEqual(data["error_info"]["code"], "content_policy")
        self.assertEqual(data["error_info"]["message"], "Blocked by policy.")

    # ── image field ──────────────────────────────────────────────────────────

    def test_image_null_for_queued(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertIsNone(data["image"])

    def test_image_null_for_running(self):
        data = MonsterImageGenerationJobSerializer(self._running_job()).data
        self.assertIsNone(data["image"])

    def test_image_null_for_failed(self):
        data = MonsterImageGenerationJobSerializer(self._failed_job()).data
        self.assertIsNone(data["image"])

    def test_image_null_for_blocked(self):
        data = MonsterImageGenerationJobSerializer(self._blocked_job()).data
        self.assertIsNone(data["image"])

    def test_image_present_for_succeeded(self):
        data = MonsterImageGenerationJobSerializer(self._succeeded_job()).data
        self.assertIsNotNone(data["image"])
        self.assertIn("id", data["image"])
        self.assertIn("public_image_url", data["image"])

    # ── raw fields not exposed ───────────────────────────────────────────────

    def test_raw_prompt_not_in_output(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertNotIn("raw_prompt", data)

    def test_raw_provider_response_not_in_output(self):
        data = MonsterImageGenerationJobSerializer(self._queued_job()).data
        self.assertNotIn("raw_provider_response", data)
        self.assertNotIn("provider_response", data)


# ===========================================================================
# MonsterImageGenerationJobCreateSerializer (write)
# ===========================================================================


class JobCreateSerializerTests(TestCase):

    def test_empty_data_is_valid(self):
        """should_email_when_done and monster_id are both optional."""
        s = MonsterImageGenerationJobCreateSerializer(data={})
        self.assertTrue(s.is_valid(), s.errors)

    def test_should_email_when_done_accepted(self):
        s = MonsterImageGenerationJobCreateSerializer(
            data={"should_email_when_done": True}
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertTrue(s.validated_data["should_email_when_done"])

    def test_monster_id_not_in_serializer(self):
        """monster_id now comes from URL kwargs, not the request body."""
        s = MonsterImageGenerationJobCreateSerializer()
        self.assertNotIn("monster_id", s.fields)

    def test_monster_id_in_body_is_ignored(self):
        """Supplying monster_id in the body is harmlessly ignored by DRF."""
        monster_id = uuid.uuid4()
        s = MonsterImageGenerationJobCreateSerializer(
            data={"monster_id": str(monster_id)}
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertNotIn("monster_id", s.validated_data)

    def test_status_field_not_in_serializer(self):
        """status is server-controlled; clients must never be able to set it."""
        s = MonsterImageGenerationJobCreateSerializer()
        self.assertNotIn("status", s.fields)

    def test_owner_field_not_in_serializer(self):
        """owner is always set from auth context, never from client input."""
        s = MonsterImageGenerationJobCreateSerializer()
        self.assertNotIn("owner", s.fields)
        self.assertNotIn("owner_id", s.fields)

    def test_provider_field_not_in_serializer(self):
        """Provider details are internal server configuration."""
        s = MonsterImageGenerationJobCreateSerializer()
        self.assertNotIn("provider", s.fields)
        self.assertNotIn("provider_model", s.fields)

    def test_sanitized_prompt_not_in_serializer(self):
        s = MonsterImageGenerationJobCreateSerializer()
        self.assertNotIn("sanitized_prompt", s.fields)
        self.assertNotIn("prompt_version", s.fields)
        self.assertNotIn("prompt_hash", s.fields)

    def test_generation_mode_not_in_serializer(self):
        """generation_mode is a server-controlled configuration decision."""
        s = MonsterImageGenerationJobCreateSerializer()
        self.assertNotIn("generation_mode", s.fields)

    def test_supplying_status_does_not_error_but_is_ignored(self):
        """
        If status is supplied it is simply ignored (not a validation error),
        since DRF Serializer discards unknown fields by default.
        """
        s = MonsterImageGenerationJobCreateSerializer(data={"status": "succeeded"})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertNotIn("status", s.validated_data)

    def test_supplying_owner_does_not_error_but_is_ignored(self):
        s = MonsterImageGenerationJobCreateSerializer(data={"owner": str(uuid.uuid4())})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertNotIn("owner", s.validated_data)


# ===========================================================================
# MonsterImageGenerationJobNotificationUpdateSerializer (write)
# ===========================================================================


class JobNotificationUpdateSerializerTests(TestCase):

    def test_should_email_when_done_true_accepted(self):
        s = MonsterImageGenerationJobNotificationUpdateSerializer(
            data={"should_email_when_done": True}
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertTrue(s.validated_data["should_email_when_done"])

    def test_should_email_when_done_false_accepted(self):
        s = MonsterImageGenerationJobNotificationUpdateSerializer(
            data={"should_email_when_done": False}
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertFalse(s.validated_data["should_email_when_done"])

    def test_missing_field_fails(self):
        s = MonsterImageGenerationJobNotificationUpdateSerializer(data={})
        self.assertFalse(s.is_valid())
        self.assertIn("should_email_when_done", s.errors)

    def test_only_expected_field_present(self):
        s = MonsterImageGenerationJobNotificationUpdateSerializer()
        self.assertIn("should_email_when_done", s.fields)
        # No other fields should be present
        self.assertEqual(list(s.fields.keys()), ["should_email_when_done"])
