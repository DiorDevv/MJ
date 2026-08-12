import time
from collections import defaultdict, deque

from app.exceptions import RateLimitExceededError

# In-memory sliding-window counters, keyed by an arbitrary string (e.g. "login-ip:1.2.3.4").
# The backend runs as a single uvicorn process (see Dockerfile), so a per-process
# in-memory store is sufficient — this would need a shared store (e.g. Redis) if the
# backend were ever scaled to multiple worker processes/replicas.
_buckets: dict[str, deque[float]] = defaultdict(deque)


def check_rate_limit(key: str, limit: int, window_seconds: float) -> None:
    now = time.monotonic()
    bucket = _buckets[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= limit:
        raise RateLimitExceededError()
    bucket.append(now)


def reset_rate_limits() -> None:
    """Test-only hook: clears all counters so test cases don't bleed into each other."""
    _buckets.clear()
