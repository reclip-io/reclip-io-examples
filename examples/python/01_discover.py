"""Read identity, tool catalog, and workspace usage. Does not submit jobs."""
import json
from common import api, report


def main():
    client = api.Client()
    print(json.dumps({name: client.call(name) for name in ('identity', 'tools', 'usage')}, indent=2))


if __name__ == '__main__':
    report(main)
