"""Compress a video, then extract MP3 from its output under an aggregate credit cap."""
import argparse
import json
from pathlib import Path
from common import api, report


def chain(client, source, directory, total, first_cap):
    api.integer(total)
    api.integer(first_cap, 0, total)
    source, directory = Path(source), Path(directory)
    uploaded = api.upload(client, source, 'video_compressor', directory / 'upload.state.json')
    first = api.job_payload({'tool': 'video_compressor', 'input': {
        'asset_id': uploaded['asset_id'], 'file_name': source.name, 'crf': 28,
        'preset': 'medium', 'max_width': 1280, 'max_fps': 30, 'audio_bitrate_kbps': 128}}, first_cap)
    accepted = api.submit_saved(client, 'submit', first, directory / 'compress.state.json')
    compressed = api.wait_job(client, accepted['id'])
    video = next((x for x in compressed.get('outputs', []) if x.get('asset_id') and (x.get('mime_type') or '').startswith('video/')), None)
    if video is None:
        raise api.ClientError('Compression returned no video asset; no next step was submitted.')
    actual = (compressed.get('credits') or {}).get('actual')
    # Reserve the entire cap if settled billing is unavailable. Never use the estimate as settled spend.
    reserved = first_cap if actual is None else api.integer(actual)
    if reserved > total:
        raise api.ClientError('First-step cost exceeds the total budget; no next step was submitted.')
    second_path = directory / 'extract.state.json'
    second_cap = total - reserved
    if second_path.exists():
        # Billing can become available later. Keep the original second-step request on resume.
        saved = api.read_json(second_path, state=True)
        previous_cap = api.integer(saved['request']['body']['maximum_credits'])
        if previous_cap > second_cap:
            raise api.ClientError('Saved second-step cap exceeds the remaining budget. Inspect the saved job; no replacement was submitted.')
        second_cap = previous_cap
    second = api.job_payload({'tool': 'mp4_to_mp3', 'input': {
        'asset_id': video['asset_id'], 'file_name': video.get('file_name') or 'compressed.mp4', 'operation': 'extract_mp3'}}, second_cap)
    accepted = api.submit_saved(client, 'submit', second, second_path)
    extracted = api.wait_job(client, accepted['id'])
    return {'compression_job': compressed, 'audio_job': extracted}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('file', type=Path)
    p.add_argument('--state-dir', required=True, type=Path)
    p.add_argument('--maximum-credits', required=True, type=int)
    p.add_argument('--first-step-cap', required=True, type=int)
    args = p.parse_args()
    print(json.dumps(chain(api.Client(), args.file, args.state_dir, args.maximum_credits, args.first_step_cap), indent=2))


if __name__ == '__main__':
    report(main)
