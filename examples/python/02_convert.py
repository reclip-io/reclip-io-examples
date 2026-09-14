"""Upload a video, quote and extract MP3, wait, and download. Reuse --state-dir to resume."""
import argparse
import json
from pathlib import Path
from common import api, report


def convert(client, source, directory, budget):
    api.integer(budget)
    source, directory = Path(source), Path(directory)
    upload = api.upload(client, source, 'mp4_to_mp3', directory / 'upload.state.json')
    request = api.job_payload({'tool': 'mp4_to_mp3', 'input': {
        'asset_id': upload['asset_id'], 'file_name': source.name, 'operation': 'extract_mp3'}}, budget)
    accepted = api.submit_saved(client, 'submit', request, directory / 'job.state.json')
    return api.wait_job(client, accepted['id'])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('file', type=Path)
    p.add_argument('--state-dir', required=True, type=Path)
    p.add_argument('--maximum-credits', required=True, type=int)
    p.add_argument('--output', required=True, type=Path)
    args = p.parse_args()
    if args.output.exists():
        raise api.ClientError('Output already exists. Choose another path; state will reuse the original job.')
    client = api.Client()
    result = convert(client, args.file, args.state_dir, args.maximum_credits)
    audio = next((x for x in result.get('outputs', []) if x.get('asset_id') and (x.get('mime_type') or '').startswith('audio/')), None)
    if audio is None:
        print(json.dumps(result, indent=2))
        raise api.ClientError('No downloadable audio output was returned. Inspect the successful job before continuing.')
    saved = api.download(client, audio['asset_id'], args.output)
    print(json.dumps({'job_id': result['id'], 'credits': result.get('credits'), 'download': saved}, indent=2))


if __name__ == '__main__':
    report(main)
