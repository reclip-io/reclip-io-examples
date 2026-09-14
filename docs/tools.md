# Tool coverage

The beta catalog contains 24 server tools. This repository provides deep executable examples for MP3 extraction and video compression, a clipping walkthrough, and generic submission helpers for every tool. A catalog entry is not proof of live-provider acceptance.

Inspect one live tool or its offline snapshot:

```bash
python3 lib/reclip/scripts/reclip_api.py tool ai_clipper
python3 lib/reclip/scripts/reclip_api.py catalog ai_clipper
python3 lib/reclip/scripts/reclip_api.py tool ai_clipper --offline
```

The [bundled catalog](../lib/reclip/references/tool-catalog.json) records full JSON schemas and the exact backend revision. Required top-level input fields below are an index, not complete valid requests: inspect enums, conditional fields, limits, nested options and source restrictions before submitting.

| Tool | Capability | Required input fields |
|---|---|---|
| `ai_clone` | AI Video Clone | `motion_asset_id`, `character_asset_id`, `prompt`, `mode`, `motion_duration_seconds` |
| `ai_video_generator` | AI Video Generator | `prompt`, `model`, `format`, `duration_seconds`, `variants`, `reference_kind`, `grok_mode`, `grok_resolution`, `seedance_resolution`, `omni_resolution`, `audio_enabled`, `input_asset_ids` |
| `ai_ad_generator` | AI Ad Generator | `prompt`, `model`, `format`, `duration_seconds`, `variants`, `grok_mode`, `grok_resolution`, `seedance_resolution`, `omni_resolution`, `audio_enabled`, `product_asset_id`, `avatar_asset_id` |
| `ai_image_generator` | AI Image Generator | `input_asset_ids`, `prompt`, `model`, `aspect_ratio` |
| `image_background_remover` | Remove Image Background | `asset_id`, `file_name`, `model` |
| `ai_clipper` | AI Video Clipper | `options` |
| `ai_captions` | AI Captions | `duration_seconds`, `start_seconds`, `options` |
| `video_to_prompt` | Video to Prompt Generator | `asset_id`, `file_name`, `analysis_start_seconds`, `analysis_end_seconds` |
| `caption_remover` | Caption Remover | `asset_id`, `file_name`, `duration_seconds`, `region` |
| `video_subtitle_remover` | Subtitle Removal | `asset_id`, `file_name`, `duration_seconds`, `region` |
| `watermark_remover` | Watermark Remover | `asset_id`, `file_name`, `duration_seconds`, `region` |
| `sora_watermark` | Sora Watermark Remover | `source_url`, `file_name` |
| `ai_voiceover` | AI Voiceover | `script`, `voice_id`, `model_id`, `public_owner_id`, `voice_source`, `stability`, `similarity`, `speed`, `use_speaker_boost` |
| `translate_and_dub` | AI Video Translator | `asset_id`, `file_name`, `duration_seconds`, `source_language_code`, `target_language_code`, `voice_id`, `model_id`, `public_owner_id`, `voice_source`, `stability`, `similarity`, `speed`, `use_speaker_boost`, `caption_content_mode`, `caption_group_size`, `caption_style` |
| `roblox_rant` | Roblox Rant | `operation`, `input_asset_ids`, `project_id`, `background_key`, `script`, `file_name`, `voice_id`, `model_id`, `public_owner_id`, `voice_source`, `stability`, `similarity`, `speed`, `use_speaker_boost`, `duration_seconds`, `video_layout`, `caption_style`, `caption_group_size`, `captions_enabled`, `caption_words`, `caption_editor_style` |
| `video_downloader` | Video Downloader | `source_url`, `platform`, `file_name`, `format_id`, `maximum_download_bytes`, `has_audio`, `source_title`, `source_creator`, `source_thumbnail_url`, `source_duration_seconds` |
| `youtube_transcript` | YouTube Transcript | `source_url`, `include_timestamps` |
| `tiktok_transcript` | TikTok Transcript | `source_url`, `include_timestamps` |
| `mp4_to_mp3` | MP4 to MP3 & Remove Audio | `asset_id`, `operation`, `file_name` |
| `video_compressor` | Video Compressor | `asset_id`, `file_name`, `crf`, `preset`, `max_width`, `max_fps`, `audio_bitrate_kbps` |
| `video_cropper` | Video Cropper | `asset_id`, `file_name`, `mode`, `crop_x`, `crop_y`, `crop_width`, `crop_height`, `aspect_ratio`, `anchor` |
| `video_trimmer` | Video Trimmer | `asset_id`, `file_name`, `start_time`, `end_time` |
| `video_to_gif` | Video to GIF | `asset_id`, `file_name`, `start_time`, `end_time`, `fps`, `width` |
| `transcription` | Transcription | `asset_id`, `file_name`, `duration_seconds`, `include_timestamps` |

Tool-specific `options` can be supplied inside input or in the outer request, not both. Do not guess model or voice identifiers; query the tool catalog. A tool's free UI tier does not remove paid API eligibility. Browser-local `gemini_watermark_remover` and `gemini_watermark_bulk_remover` are outside public API coverage.
