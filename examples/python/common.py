"""Load the vendored, dependency-free client from this repository."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'lib/reclip/scripts'))
import reclip_api as api


def report(main):
    try:
        main()
    except (api.ClientError, OSError, ValueError, KeyError, TypeError) as error:
        print(str(error) if isinstance(error, api.ClientError) else 'Invalid input or unexpected API result. Preserve state before retrying.', file=sys.stderr)
        sys.exit(1)
