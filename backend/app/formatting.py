"""Human-friendly formats for messages shown to (often older) users."""

from datetime import date, time


def fmt_time(t: time) -> str:
    """08:00 -> '8:00 AM'."""
    hour = t.hour % 12 or 12
    return f"{hour}:{t.minute:02d} {'AM' if t.hour < 12 else 'PM'}"


def fmt_date(d: date) -> str:
    """2026-09-01 -> '1 Sep 2026'."""
    return f"{d.day} {d:%b %Y}"
