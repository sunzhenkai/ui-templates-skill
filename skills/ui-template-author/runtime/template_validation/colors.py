from __future__ import annotations

import math
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Color:
    r: float
    g: float
    b: float
    a: float = 1.0

    def opaque(self) -> bool:
        return math.isclose(self.a, 1.0, abs_tol=1e-9)


_HEX = re.compile(r"^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
_OKLCH = re.compile(
    r"^oklch\(\s*(?P<l>[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?)\s+"
    r"(?P<c>[+-]?(?:\d+(?:\.\d*)?|\.\d+))\s+"
    r"(?P<h>[+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:deg)?"
    r"(?:\s*/\s*(?P<a>[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?))?\s*\)$",
    re.IGNORECASE,
)


def _alpha(value: str | None) -> float:
    if value is None:
        return 1.0
    alpha = float(value[:-1]) / 100.0 if value.endswith("%") else float(value)
    if not 0.0 <= alpha <= 1.0:
        raise ValueError("alpha must be between 0 and 1")
    return alpha


def parse_color(value: str) -> Color:
    if not isinstance(value, str):
        raise ValueError("color must be a string")
    match = _HEX.fullmatch(value.strip())
    if match:
        raw = match.group(1)
        channels = [int(raw[index:index + 2], 16) / 255.0 for index in (0, 2, 4)]
        alpha = int(raw[6:8], 16) / 255.0 if len(raw) == 8 else 1.0
        return Color(*(_srgb_to_linear(channel) for channel in channels), alpha)
    match = _OKLCH.fullmatch(value.strip())
    if not match:
        raise ValueError(f"unsupported color syntax: {value!r}")
    light_text = match.group("l")
    light = float(light_text[:-1]) / 100.0 if light_text.endswith("%") else float(light_text)
    chroma = float(match.group("c"))
    hue = float(match.group("h")) % 360.0
    if not 0.0 <= light <= 1.0 or chroma < 0.0:
        raise ValueError("OKLCH lightness must be 0..1 and chroma must be non-negative")
    angle = math.radians(hue)
    lab_a, lab_b = chroma * math.cos(angle), chroma * math.sin(angle)
    l_ = light + 0.3963377774 * lab_a + 0.2158037573 * lab_b
    m_ = light - 0.1055613458 * lab_a - 0.0638541728 * lab_b
    s_ = light - 0.0894841775 * lab_a - 1.2914855480 * lab_b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    blue = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return Color(_clip(red), _clip(green), _clip(blue), _alpha(match.group("a")))


def _clip(value: float) -> float:
    return min(1.0, max(0.0, value))


def _srgb_to_linear(value: float) -> float:
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def composite(foreground: Color, background: Color) -> Color:
    out_a = foreground.a + background.a * (1.0 - foreground.a)
    if out_a <= 0:
        raise ValueError("cannot composite two fully transparent colors")
    return Color(
        (foreground.r * foreground.a + background.r * background.a * (1.0 - foreground.a)) / out_a,
        (foreground.g * foreground.a + background.g * background.a * (1.0 - foreground.a)) / out_a,
        (foreground.b * foreground.a + background.b * background.a * (1.0 - foreground.a)) / out_a,
        out_a,
    )


def relative_luminance(color: Color) -> float:
    if not color.opaque():
        raise ValueError("relative luminance requires an opaque color")
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b


def contrast_ratio(first: Color, second: Color) -> float:
    l1, l2 = relative_luminance(first), relative_luminance(second)
    high, low = max(l1, l2), min(l1, l2)
    return (high + 0.05) / (low + 0.05)
